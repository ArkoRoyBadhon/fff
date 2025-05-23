require("dotenv").config();
const MailChecker = require("mailchecker");
const mongoose = require("mongoose");
const Order = require("../models/Order");
const { sendEmail } = require("../lib/email-sender/sender");
const { handleCreateInvoice } = require("../lib/email-sender/create");
const customerInvoiceEmailBody = require("../lib/email-sender/templates/order-to-customer");
const User = require("../models/User");
const createNotificationFunc = require("../utils/createNotification");

const addOrder = async (req, res) => {
  console.log("addOrder", req.body);
  try {
    const newOrder = new Order({
      ...req.body,
      user: req.user._id,
    });
    const order = await newOrder.save();
    await createNotificationFunc(
      req.body?.seller,
      "seller",
      "info",
      "other",
      `An Order submitted by User`,
      `/seller/orders/${order?._id}`,
      { order: "create" }
    );
    res.status(201).send(order);
  } catch (err) {
    res.status(500).send({
      message: err.message,
    });
  }
};

// get all orders user
const getOrderCustomer = async (req, res) => {
  try {
    const { page, limit, status } = req.query;
    console.log("status", limit);

    const pages = Number(page) || 1;
    const limits = Number(limit) || 8;
    const skip = (pages - 1) * limits;

    const baseConditions = {};
    if (req.user._id) {
      baseConditions.user = req.user._id;
    }

    if (status && status !== "All") {
      baseConditions.status = status;
    }

    const userType = await User.findById(req.user._id);

    let totalDoc;
    if (userType?.role.includes("buyer")) {
      totalDoc = await Order.countDocuments({
        user: req.user._id,
      });
    } else if (userType?.role.includes("seller")) {
      totalDoc = await Order.countDocuments({
        seller: req.user._id,
      });
    }

    // total padding order count
    const totalPendingOrder = await Order.aggregate([
      {
        $match: {
          status: "Pending",
          user: mongoose.Types.ObjectId(req.user._id),
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$total" },
          count: {
            $sum: 1,
          },
        },
      },
    ]);

    // total padding order count
    const totalProcessingOrder = await Order.aggregate([
      {
        $match: {
          status: "Processing",
          user: mongoose.Types.ObjectId(req.user._id),
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$total" },
          count: {
            $sum: 1,
          },
        },
      },
    ]);

    const totalDeliveredOrder = await Order.aggregate([
      {
        $match: {
          status: "Delivered",
          user: mongoose.Types.ObjectId(req.user._id),
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$total" },
          count: {
            $sum: 1,
          },
        },
      },
    ]);

    // today order amount

    const findConditions = { ...baseConditions };
    console.log("findConditions", findConditions);
    let orders;
    if (userType?.role.includes("buyer")) {
      orders = await Order.find(findConditions)
        .populate("product")
        .sort({ _id: -1 })
        .skip(skip)
        .limit(limits);
    } else if (userType?.role.includes("seller")) {
      orders = await Order.find({ seller: req.user._id })
        .populate("product")
        .sort({ _id: -1 })
        .skip(skip)
        .limit(limits);
    }

    res.send({
      orders,
      limits,
      pages,
      pending: totalPendingOrder.length === 0 ? 0 : totalPendingOrder[0].count,
      processing:
        totalProcessingOrder.length === 0 ? 0 : totalProcessingOrder[0].count,
      delivered:
        totalDeliveredOrder.length === 0 ? 0 : totalDeliveredOrder[0].count,

      totalDoc,
    });
  } catch (err) {
    res.status(500).send({
      message: err.message,
    });
  }
};
const getOrderSeller = async (req, res) => {
  try {
    const { page, limit, status } = req.query;
    console.log("status", limit);

    const pages = Number(page) || 1;
    const limits = Number(limit) || 8;
    const skip = (pages - 1) * limits;

    const baseConditions = {};
    if (req.user._id) {
      baseConditions.user = req.user._id;
    }

    if (status && status !== "All") {
      baseConditions.status = status;
    }

    const totalDoc = await Order.countDocuments({
      seller: req.user._id,
    });

    // total padding order count
    const totalPendingOrder = await Order.aggregate([
      {
        $match: {
          status: {
            $in: ["Pending", "Processing", "Shipped", "Delivered"],
          },
          seller: mongoose.Types.ObjectId(req.user._id),
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$total" },
          count: {
            $sum: 1,
          },
        },
      },
    ]);

    // total padding order count
    const totalProcessingOrder = await Order.aggregate([
      {
        $match: {
          status: { $in: ["Cancelled", "Return"] },
          seller: mongoose.Types.ObjectId(req.user._id),
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$total" },
          count: {
            $sum: 1,
          },
        },
      },
    ]);

    const totalDeliveredOrder = await Order.aggregate([
      {
        $match: {
          status: "Completed",
          seller: mongoose.Types.ObjectId(req.user._id),
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$total" },
          count: {
            $sum: 1,
          },
        },
      },
    ]);

    const findConditions = { ...baseConditions };
    console.log("findConditions", findConditions);

    const orders = await Order.find({ seller: req.user._id })
      .populate("product")
      .sort({ _id: -1 })
      .skip(skip)
      .limit(limits);

    res.send({
      orders,
      limits,
      pages,
      ongoing: totalPendingOrder.length === 0 ? 0 : totalPendingOrder[0].count,
      completed:
        totalProcessingOrder.length === 0 ? 0 : totalProcessingOrder[0].count,
      cancelled:
        totalDeliveredOrder.length === 0 ? 0 : totalDeliveredOrder[0].count,

      totalDoc,
    });
  } catch (err) {
    res.status(500).send({
      message: err.message,
    });
  }
};
const getOrderAdmin = async (req, res) => {
  try {
    // console.log("getOrderCustomer");
    const { page, limit } = req.query;

    const pages = Number(page) || 1;
    const limits = Number(limit) || 8;
    const skip = (pages - 1) * limits;

    const totalDoc = await Order.countDocuments({});

    // total padding order count
    const totalPendingOrder = await Order.aggregate([
      {
        $match: {
          status: "Pending",
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$total" },
          count: {
            $sum: 1,
          },
        },
      },
    ]);

    // total padding order count
    const totalProcessingOrder = await Order.aggregate([
      {
        $match: {
          status: "Processing",
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$total" },
          count: {
            $sum: 1,
          },
        },
      },
    ]);

    const totalDeliveredOrder = await Order.aggregate([
      {
        $match: {
          status: "Delivered",
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$total" },
          count: {
            $sum: 1,
          },
        },
      },
    ]);

    // today order amount
    // const userType = await User.findById(req.user._id);

    let orders;
    orders = await Order.find({})
      .populate("product")
      .sort({ _id: -1 })
      .skip(skip)
      .limit(limits);

    res.send({
      orders,
      limits,
      pages,
      pending: totalPendingOrder.length === 0 ? 0 : totalPendingOrder[0].count,
      processing:
        totalProcessingOrder.length === 0 ? 0 : totalProcessingOrder[0].count,
      delivered:
        totalDeliveredOrder.length === 0 ? 0 : totalDeliveredOrder[0].count,

      totalDoc,
    });
  } catch (err) {
    res.status(500).send({
      message: err.message,
    });
  }
};
const getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate("product")
      .populate("disputes");

    if (!order) {
      return res.status(404).send({
        message: "Order not found",
      });
    }

    res.send(order);
  } catch (err) {
    res.status(500).send({
      message: err.message,
    });
  }
};

const sendEmailInvoiceToCustomer = async (req, res) => {
  try {
    const user = req.body.user_info;
    // Validate email using MailChecker
    // Validate email using MailChecker
    if (!MailChecker.isValid(user?.email)) {
      // Return a response indicating invalid email instead of using process.exit
      return res.status(400).send({
        message:
          "Invalid or disposable email address. Please provide a valid email.",
      });
    }
    // console.log("sendEmailInvoiceToCustomer");
    const pdf = await handleCreateInvoice(req.body, `${req.body.invoice}.pdf`);

    const option = {
      date: req.body.date,
      invoice: req.body.invoice,
      status: req.body.status,
      method: req.body.paymentMethod,
      subTotal: req.body.subTotal,
      total: req.body.total,
      discount: req.body.discount,
      shipping: req.body.shippingCost,
      currency: req.body.company_info.currency,
      company_name: req.body.company_info.company,
      company_address: req.body.company_info.address,
      company_phone: req.body.company_info.phone,
      company_email: req.body.company_info.email,
      company_website: req.body.company_info.website,
      vat_number: req.body?.company_info?.vat_number,
      name: user?.name,
      email: user?.email,
      phone: user?.phone,
      address: user?.address,
      cart: req.body.cart,
    };

    const body = {
      from: req.body.company_info?.from_email || "sales@kachabazar.com",
      to: user.email,
      subject: `Your Order - ${req.body.invoice} at ${req.body.company_info.company}`,
      html: customerInvoiceEmailBody(option),
      attachments: [
        {
          filename: `${req.body.invoice}.pdf`,
          content: pdf,
        },
      ],
    };
    const message = `Invoice successfully sent to the customer ${user.name}`;
    sendEmail(body, res, message);
  } catch (err) {
    res.status(500).send({
      message: err.message,
    });
  }
};

const addModification = async (req, res) => {
  try {
    const {
      additionalNote,
      quantity,
      total,
      color,
      material,
      requestedBy,
      orderId,
    } = req.body;

    if (quantity === undefined || !requestedBy) {
      return res.status(400).json({
        success: false,
        message: "Note, quantity, and requestedBy are required",
      });
    }

    if (!Number.isInteger(quantity) || quantity < 1) {
      return res.status(400).json({
        success: false,
        message: "Quantity must be a positive integer",
      });
    }

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    const userExists = await mongoose
      .model("User")
      .exists({ _id: requestedBy });
    if (!userExists) {
      return res.status(400).json({
        success: false,
        message: "RequestedBy user not found",
      });
    }

    // Check if a modification already exists for this user
    const existingModificationIndex = order.modifications.findIndex(
      (mod) => mod.requestedBy.toString() === requestedBy
    );

    if (existingModificationIndex !== -1) {
      // Update the existing modification
      order.modifications[existingModificationIndex].additionalNote =
        additionalNote.trim();
      order.modifications[existingModificationIndex].quantity = quantity;
      order.modifications[existingModificationIndex].color = color;
      order.modifications[existingModificationIndex].material = material;
      order.modifications[existingModificationIndex].total = total;
      order.modifications[existingModificationIndex].requestedAt = new Date();
      order.modifications[existingModificationIndex].status = "Pending";
    } else {
      // Add a new modification
      const modification = {
        additionalNote: additionalNote.trim(),
        quantity,
        color,
        material,
        total,
        requestedBy,
        status: "Pending",
        requestedAt: new Date(),
      };
      order.modifications.push(modification);
    }

    const updatedOrder = await order.save();

    // Populate the relevant fields
    const populatedOrder = await Order.findById(orderId)
      .populate("modifications.requestedBy", "name email")
      .populate("user", "name email")
      .populate("seller", "name email");

    await createNotificationFunc(
      order?.seller,
      "seller",
      "info",
      "other",
      `A Modification submitted by User`,
      `/seller/orders/${orderId}`,
      { modification: orderId }
    );

    res.status(201).json({
      success: true,
      message: "Modification request processed successfully",
      data: {
        orderId: populatedOrder._id,
        currentQuantity: populatedOrder.quantity,
        modifications: populatedOrder.modifications,
        status: populatedOrder.status,
      },
    });
  } catch (error) {
    console.error("Error adding modification:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

const getModifications = async (req, res) => {
  try {
    const { id: orderId } = req.params;

    // Validate orderId format
    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid order ID format",
      });
    }

    const order = await Order.findById(orderId)
      .populate("modifications.requestedBy", "firstName lastName email role")
      .populate("user", "name email")
      .populate("seller", "name email");

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Modifications retrieved successfully",
      data: {
        orderId: order._id,
        modifications: order.modifications,
        currentQuantity: order.quantity,
        status: order.status,
      },
    });
  } catch (error) {
    console.error("Error getting modifications:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

const updateModificationStatus = async (req, res) => {
  try {
    const { orderId, modificationId } = req.params;
    const { status, responseNote } = req.body;

    if (
      !mongoose.Types.ObjectId.isValid(orderId) ||
      !mongoose.Types.ObjectId.isValid(modificationId)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid ID format",
      });
    }

    const validStatuses = ["Pending", "Approved", "Rejected"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid status value. Must be one of: Pending, Approved, Rejected",
      });
    }

    // Find the order first to check the current modification status
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    const modification = order.modifications.id(modificationId);
    if (!modification) {
      return res.status(404).json({
        success: false,
        message: "Modification request not found",
      });
    }

    // Check if the modification is already in the requested status
    if (modification.status === status) {
      return res.status(400).json({
        success: false,
        message: `Modification is already ${status}`,
      });
    }

    // Prepare update object
    const updateObj = {
      "modifications.$.status": status,
      "modifications.$.respondedAt": new Date(),
    };

    if (responseNote) {
      updateObj["modifications.$.responseNote"] = responseNote;
    }

    const updatedOrder = await Order.findOneAndUpdate(
      {
        _id: orderId,
        "modifications._id": modificationId,
      },
      { $set: updateObj },
      {
        new: true,
        runValidators: true,
      }
    )
      .populate("modifications.requestedBy", "firstName lastName email")
      .populate("user", "name email")
      .populate("seller", "name email");

    const updatedModification = updatedOrder.modifications.id(modificationId);

    await createNotificationFunc(
      updatedOrder?.user,
      "buyer",
      "info",
      "other",
      `A Modification ${status} by Seller`,
      `/buyer/my-orders/${updatedOrder?._id}`,
      { modification: updatedOrder?._id }
    );

    res.status(200).json({
      success: true,
      message: "Modification status updated successfully",
      data: {
        order: {
          _id: updatedOrder._id,
          status: updatedOrder.status,
          quantity: updatedOrder.quantity,
        },
        modification: updatedModification,
      },
    });
  } catch (error) {
    console.error("Error updating modification status:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

const BuyerDashboardStats = async (req, res) => {
  try {
    const buyerId = req.user._id;

    const totalOrders = await Order.countDocuments({ user: buyerId });
    const processingOrders = await Order.countDocuments({
      user: buyerId,
      status: { $in: ["Pending", "Processing", "Shipped", "Delivered"] },
    });
    const completeOrders = await Order.countDocuments({
      user: buyerId,
      status: "Completed",
    });

    res.status(200).json({
      success: true,
      data: {
        totalOrders,
        processingOrders,
        completeOrders,
      },
    });
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

module.exports = {
  addOrder,
  getOrderById,
  getOrderCustomer,
  getOrderSeller,
  getOrderAdmin,
  sendEmailInvoiceToCustomer,
  // modification related controller
  addModification,
  getModifications,
  updateModificationStatus,

  // dashboard statics
  BuyerDashboardStats,
};
