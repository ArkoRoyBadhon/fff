const Dispute = require("../models/Dispute");
const Order = require("../models/Order");
const createNotificationFunc = require("../utils/createNotification");

const addDispute = async (req, res) => {
  try {
    const { orderId, reason, documents } = req.body;

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).send({ message: "Order not found" });
    }

    const newDispute = new Dispute({
      requestedBy: req.user._id,
      role: req.user.role[0],
      reason,
      documents,
      status: "pending",
    });

    const dispute = await newDispute.save();

    await Order.findByIdAndUpdate(orderId, {
      $push: { disputes: dispute._id },
      $set: {
        isDisputeActive: true,
      },
    });

    res.status(201).send(dispute);
  } catch (err) {
    res.status(500).send({
      message: err.message,
    });
  }
};

const getOrderDisputes = async (req, res) => {
  try {
    const { orderId } = req.params;

    const order = await Order.findById(orderId).populate({
      path: "disputes",
      populate: {
        path: "requestedBy resolvedBy",
        select: "name email",
      },
    });

    if (!order) {
      return res.status(404).send({ message: "Order not found" });
    }

    res.status(200).send(order.disputes);
  } catch (err) {
    res.status(500).send({
      message: err.message,
    });
  }
};

const updateDisputeStatus = async (req, res) => {
  try {
    const { disputeId } = req.params;
    const { status, adminNote, disputePausedActions, ...rest } = req.body;

    // Validate status
    if (!["approved", "rejected", "resolved"].includes(status)) {
      return res.status(400).send({ message: "Invalid status" });
    }

    // Update dispute
    const updatedDispute = await Dispute.findByIdAndUpdate(
      disputeId,
      {
        status,
        adminNote,
        // resolvedAt: new Date(),
        // resolvedBy: req.user._id,
      },
      { new: true }
    );

    // Find all orders containing this dispute
    const orders = await Order.find({ disputes: disputeId });

    for (const order of orders) {
      const disputes = await Dispute.find({ _id: { $in: order.disputes } });

      const isDisputeActive = disputes.some((d) =>
        ["pending", "approved"].includes(d.status)
      );

      const rr = await Order.findByIdAndUpdate(order._id, {
        isDisputeActive,
        disputePausedActions,
        ...rest,
      });
    }

    // await createNotificationFunc(
    //   orders?.user,
    //   "buyer",
    //   "info",
    //   "other",
    //   `A Modification Updated by Seller`,
    //   `/buyer/my-orders/${orders?._id}`,
    //   { dispute: "resolve" }
    // );

    res.status(200).send(updatedDispute);
  } catch (err) {
    res.status(500).send({
      message: err.message,
    });
  }
};

module.exports = {
  addDispute,
  getOrderDisputes,
  updateDisputeStatus,
};
