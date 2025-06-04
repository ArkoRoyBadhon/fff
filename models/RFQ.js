const mongoose = require("mongoose");

const rfqSchema = new mongoose.Schema(
  {
    rfqNumber: { type: String, required: true, unique: true },
    buyer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    productName: { type: String, required: true },
    address: { type: String, required: true },
    sourcingQuantity: { type: Number, required: true },
    detailedRequirements: { type: String, required: true },
    status: {
      type: String,
      required: true,
      enum: ["Draft", "Published", "Closed", "Cancelled"],
      default: "Published",
    },
    quotationsCount: { type: Number, default: 0 },
    dateCreated: { type: Date, default: Date.now },
    // deadline: { type: Date, required: true },
    isTermAgreed: { type: Boolean, default: false },
    imageUrl: [{ type: String }],
  },
  { timestamps: true }
);

module.exports = mongoose.model("RFQ", rfqSchema);
