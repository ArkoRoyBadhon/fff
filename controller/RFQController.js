const mongoose = require("mongoose");
const RFQ = require("../models/RFQ");
const Quotation = require("../models/Quotation");
const createNotificationFunc = require("../utils/createNotification");

const createRFQ = async (req, res) => {
  try {
    const { buyer, productName, address, quantity, requirements, imageUrl } =
      req.body;

    // Basic validation
    if (!productName || !address || !quantity || !requirements) {
      return res
        .status(400)
        .json({ message: "Please provide all required fields" });
    }

    const count = await RFQ.countDocuments();

    const rfqNumber = `RFQ-${new Date().getFullYear()}-${(count + 1)
      .toString()
      .padStart(4, "0")}`;

    console.log(rfqNumber);

    const newRFQ = new RFQ({
      rfqNumber,
      buyer: req.user.id,
      productName,
      address,
      sourcingQuantity: quantity,
      detailedRequirements: requirements,
      imageUrl: imageUrl || null,
      isTermAgreed: true,
    });

    const savedRFQ = await newRFQ.save();
    res.status(201).json(savedRFQ);
  } catch (error) {
    console.error("Error creating RFQ:", error);
    res.status(500).json({ message: "Server error while creating RFQ" });
  }
};

const getAllRFQs = async (req, res) => {
  try {
    const { status, search, page = 1, limit = 10 } = req.query;

    const query = { status: { $nin: ["Draft"] } };

    if (status) {
      query.status = status;
    }

    if (search) {
      query.$or = [
        { productName: { $regex: search, $options: "i" } },
        { rfqNumber: { $regex: search, $options: "i" } },
        { detailedRequirements: { $regex: search, $options: "i" } },
      ];
    }

    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      sort: { createdAt: -1 },
      populate: { path: "buyer", select: "name email company" },
    };

    const rfqs = await RFQ.find(query)
      .sort({ createdAt: -1 })
      .populate("buyer", "firstName lastName email companyName");

    res.json(rfqs);
  } catch (error) {
    console.error("Error fetching RFQs:", error);
    res.status(500).json({ message: "Server error while fetching RFQs" });
  }
};

const getAllRFQsByUser = async (req, res) => {
  try {
    const userId = req.user?._id;
    const { status } = req.query;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }

    const query = { buyer: userId };

    if (status) {
      query.status = status;
    }

    const rfqs = await RFQ.find(query)
      .sort({ createdAt: -1 })
      .populate("buyer", "name email");

    res.json(rfqs);
  } catch (error) {
    console.error("Error fetching user RFQs:", error);
    res.status(500).json({ message: "Server error while fetching user RFQs" });
  }
};

const getAllRFQsBySellerQuotation = async (req, res) => {
  try {
    // Step 1: Find all RFQ IDs quoted by the supplier
    const supplierQuotations = await Quotation.find({
      supplier: req.user._id,
    }).select("rfq");
    const quotedRFQIds = supplierQuotations.map((q) => q.rfq);

    // Step 2: Fetch the RFQs corresponding to those IDs
    const rfqs = await RFQ.find({ _id: { $in: quotedRFQIds } })
      .populate("buyer", "companyName email phone")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: rfqs.length,
      data: rfqs,
    });
  } catch (error) {
    console.error("Error in getRFQsWithSupplierQuotations:", error);
    res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};

const getRFQById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid RFQ ID" });
    }

    const rfq = await RFQ.findById(id)
      .populate("buyer", "name email company")
      .populate({
        path: "quotations",
        select: "price unitPrice deliveryTime status supplier",
        populate: {
          path: "supplier",
          select: "name email company",
        },
      });

    if (!rfq) {
      return res.status(404).json({ message: "RFQ not found" });
    }

    res.json(rfq);
  } catch (error) {
    console.error("Error fetching RFQ by ID:", error);
    res.status(500).json({ message: "Server error while fetching RFQ" });
  }
};

const getRFQByIdAdmin = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid RFQ ID" });
    }

    // Get RFQ
    const rfq = await RFQ.findById(id).populate("buyer", "name email company");

    if (!rfq) {
      return res.status(404).json({ message: "RFQ not found" });
    }

    // Get all quotations for this RFQ
    const quotations = await Quotation.find({ rfq: id })
      .populate("supplier", "name email company")
      .select("price unitPrice deliveryTime status supplier");

    // Combine the data
    const response = {
      ...rfq.toObject(),
      quotations,
    };

    res.json(response);
  } catch (error) {
    console.error("Error fetching RFQ by ID:", error);
    res.status(500).json({ message: "Server error while fetching RFQ" });
  }
};

const updateRFQ = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      productName,
      address,
      sourcingQuantity,
      detailedRequirements,
      status,
      imageUrl,
    } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid RFQ ID" });
    }

    const rfq = await RFQ.findById(id);
    if (!rfq) {
      return res.status(404).json({ message: "RFQ not found" });
    }

    if (rfq.buyer.toString() !== req.user.id) {
      return res
        .status(403)
        .json({ message: "Not authorized to update this RFQ" });
    }

    if (rfq.status === "Published" || rfq.status === "Closed") {
      if (
        status &&
        status !== rfq.status &&
        status !== "Closed" &&
        status !== "Cancelled"
      ) {
        return res.status(400).json({
          message:
            "Cannot modify published RFQ. You can only close or cancel it.",
        });
      }
    }

    rfq.productName = productName || rfq.productName;
    rfq.address = address || rfq.address;
    rfq.sourcingQuantity = sourcingQuantity || rfq.sourcingQuantity;
    rfq.detailedRequirements = detailedRequirements || rfq.detailedRequirements;
    rfq.status = status || rfq.status;
    rfq.imageUrl = imageUrl !== undefined ? imageUrl : rfq.imageUrl;

    const updatedRFQ = await rfq.save();
    res.json(updatedRFQ);
  } catch (error) {
    console.error("Error updating RFQ:", error);
    res.status(500).json({ message: "Server error while updating RFQ" });
  }
};

const updateRFQAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      productName,
      address,
      sourcingQuantity,
      detailedRequirements,
      status,
      imageUrl,
    } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid RFQ ID" });
    }

    const rfq = await RFQ.findById(id);
    if (!rfq) {
      return res.status(404).json({ message: "RFQ not found" });
    }

    rfq.productName = productName || rfq.productName;
    rfq.address = address || rfq.address;
    rfq.sourcingQuantity = sourcingQuantity || rfq.sourcingQuantity;
    rfq.detailedRequirements = detailedRequirements || rfq.detailedRequirements;
    rfq.status = status || rfq.status;
    rfq.imageUrl = imageUrl !== undefined ? imageUrl : rfq.imageUrl;

    const updatedRFQ = await rfq.save();

    if (status === "Closed") {
      await createNotificationFunc(
        rfq.buyer,
        "buyer",
        "info",
        "buyingLeads",
        `Your Buying Leads ${rfq.productName} has been rejected.`,
        "/",
        { rfq }
      );
    } else if (status === "Published") {
      await createNotificationFunc(
        rfq.buyer,
        "buyer",
        "info",
        "buyingLeads",
        `Your Buying Leads ${rfq.productName} has been Activated/published.`,
        "/",
        { rfq }
      );
    }

    res.json(updatedRFQ);
  } catch (error) {
    console.error("Error updating RFQ:", error);
    res.status(500).json({ message: "Server error while updating RFQ" });
  }
};

const deleteRFQ = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid RFQ ID" });
    }

    const rfq = await RFQ.findById(id);
    if (!rfq) {
      return res.status(404).json({ message: "RFQ not found" });
    }

    // if (rfq.buyer.toString() !== req.user.id && req.user.role !== "admin") {
    //   return res
    //     .status(403)
    //     .json({ message: "Not authorized to delete this RFQ" });
    // }

    const quotationsCount = await Quotation.countDocuments({ rfq: id });
    if (quotationsCount > 0) {
      return res.status(400).json({
        message:
          "Cannot delete RFQ with submitted quotations. Cancel it instead.",
      });
    }

    await RFQ.findByIdAndDelete(id);
    res.json({ message: "RFQ deleted successfully" });
  } catch (error) {
    console.error("Error deleting RFQ:", error);
    res.status(500).json({ message: "Server error while deleting RFQ" });
  }
};

module.exports = {
  createRFQ,
  getAllRFQs,
  getAllRFQsByUser,
  getAllRFQsBySellerQuotation,
  getRFQById,
  getRFQByIdAdmin,
  updateRFQ,
  updateRFQAdmin,
  deleteRFQ,
};
