const mongoose = require("mongoose");

const quotationSchema = new mongoose.Schema(
  {
    rfq: { type: mongoose.Schema.Types.ObjectId, ref: "RFQ", required: true },
    supplier: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    price: { type: Number, required: true },
    unitPrice: { type: Number, required: true },
    deliveryTime: { type: String, required: true }, // e.g., "3 weeks"
    details: { type: String, required: true },
    status: {
      type: String,
      enum: [
        "Pending",
        "Submitted",
        "Accepted",
        "Rejected",
        "Modification Requested",
        "Withdrawn",
      ],
      default: "Submitted",
    },
    buyerNotes: { type: String },
    supplierNotes: { type: String },
    imageUrl: [{ type: String }],
    isViewed: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Quotation", quotationSchema);
