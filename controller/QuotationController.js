const mongoose = require("mongoose");
const RFQ = require("../models/RFQ");
const Quotation = require("../models/Quotation");

const createQuotation = async (req, res) => {
  try {
    const { rfq, price, unitPrice, deliveryTime, details } = req.body;

    if (!rfq || !price || !unitPrice || !deliveryTime || !details) {
      return res
        .status(400)
        .json({ message: "Please provide all required fields" });
    }

    const rfqExists = await RFQ.findById(rfq);
    if (!rfqExists) {
      return res.status(404).json({ message: "RFQ not found" });
    }

    if (rfqExists.status !== "Published") {
      return res
        .status(400)
        .json({ message: "This RFQ is not accepting quotations" });
    }

    const newQuotation = new Quotation({
      rfq,
      supplier: req.user.id,
      price,
      unitPrice,
      deliveryTime,
      details,
      status: "Submitted",
    });

    const savedQuotation = await newQuotation.save();

    await RFQ.findByIdAndUpdate(rfq, { $inc: { quotationsCount: 1 } });

    res.status(201).json(savedQuotation);
  } catch (error) {
    console.error("Error creating quotation:", error);
    res.status(500).json({ message: "Server error while creating quotation" });
  }
};

const updateQuotation = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      price,
      unitPrice,
      deliveryTime,
      details,
      status,
      buyerNotes,
      supplierNotes,
      imageUrl,
    } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid quotation ID" });
    }

    const quotation = await Quotation.findById(id);
    if (!quotation) {
      return res.status(404).json({ message: "Quotation not found" });
    }

    if (["Accepted", "Rejected"].includes(quotation.status)) {
      return res.status(400).json({
        message: "Cannot update an already accepted or rejected quotation",
      });
    }

    // Update fields
    quotation.price = price || quotation.price;
    quotation.unitPrice = unitPrice || quotation.unitPrice;
    quotation.deliveryTime = deliveryTime || quotation.deliveryTime;
    quotation.details = details || quotation.details;
    quotation.status = status || quotation.status;
    quotation.buyerNotes = buyerNotes || quotation.buyerNotes;
    quotation.supplierNotes = supplierNotes || quotation.supplierNotes;
    quotation.imageUrl = imageUrl || quotation.imageUrl;

    const updatedQuotation = await quotation.save();
    res.json(updatedQuotation);
  } catch (error) {
    console.error("Error updating quotation:", error);
    res.status(500).json({ message: "Server error while updating quotation" });
  }
};

const deleteQuotation = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid quotation ID" });
    }

    const quotation = await Quotation.findById(id);
    if (!quotation) {
      return res.status(404).json({ message: "Quotation not found" });
    }

    if (
      quotation.supplier.toString() !== req.user.id &&
      req.user.role !== "admin"
    ) {
      return res
        .status(403)
        .json({ message: "Not authorized to delete this quotation" });
    }

    await Quotation.findByIdAndDelete(id);

    await RFQ.findByIdAndUpdate(quotation.rfq, {
      $inc: { quotationsCount: -1 },
    });

    res.json({ message: "Quotation deleted successfully" });
  } catch (error) {
    console.error("Error deleting quotation:", error);
    res.status(500).json({ message: "Server error while deleting quotation" });
  }
};

const getAllQuotationsByRFQ = async (req, res) => {
  try {
    const { rfqId } = req.params;
    const { status } = req.query;

    console.log("rfqId", rfqId);

    if (!mongoose.Types.ObjectId.isValid(rfqId)) {
      return res.status(400).json({ message: "Invalid RFQ ID" });
    }

    const query = { rfq: rfqId };

    if (status) {
      query.status = status;
    }

    const rfq = await RFQ.findById(rfqId);
    if (!rfq) {
      return res.status(404).json({ message: "RFQ not found" });
    }

    const quotations = await Quotation.find({ rfq: rfqId })
      .sort({ createdAt: -1 })
      .populate("supplier")
      .populate("rfq");

    res.json(quotations);
  } catch (error) {
    console.error("Error fetching quotations by RFQ:", error);
    res.status(500).json({ message: "Server error while fetching quotations" });
  }
};

module.exports = {
  createQuotation,
  updateQuotation,
  deleteQuotation,
  getAllQuotationsByRFQ,
};
