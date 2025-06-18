const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: false,
    },
    currency: {
      type: String,
      default: "USD",
    },
    paymentMethod: {
      type: String,
      enum: ["Card", "Bank Transfer"],
      required: true,
    },
    status: {
      type: String,
      enum: ["Pending", "Completed", "Failed", "Refunded"],
      default: "Pending",
    },
    initiatedAt: {
      type: Date,
      default: Date.now,
    },
    completedAt: {
      type: Date,
    },
    reference: {
      type: String,
      required: false, // Optional external reference like a payment gateway ID
    },
    description: {
      type: String,
      maxlength: 500,
      required: false,
    },
    amount: {
      type: Number,
    },
    commision: {
      type: Number,
      default: 0,
    },
    refund: {
      isRefunded: { type: Boolean, default: false },
      refundedAmount: { type: Number, default: 0 },
      refundedAt: { type: Date },
      refundReason: { type: String, maxlength: 500 },
    },
  },
  {
    timestamps: true,
  }
);

const Transaction = mongoose.model("Transaction", transactionSchema);
module.exports = Transaction;
