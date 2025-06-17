const mongoose = require("mongoose");

const disputeSchema = new mongoose.Schema({
  requestedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  role: {
    type: String,
    enum: ["buyer", "seller"],
    required: true,
  },
  reason: {
    type: String,
    required: true,
  },
  documents: [String],
  status: {
    type: String,
    enum: ["pending", "approved", "rejected", "resolved"],
    default: "pending",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  resolvedAt: Date,
  resolvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  adminNote: String,
});

module.exports = mongoose.model("Dispute", disputeSchema);
