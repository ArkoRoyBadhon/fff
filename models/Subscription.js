const mongoose = require("mongoose");

const subscriptionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  packageId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Package",
    required: true,
  },
  transactionId: { type: String, default: null },
  status: {
    type: String,
    enum: ["active", "expired", "none"],
    default: "none",
  },
  startDate: { type: Date, default: Date.now },
  endDate: { type: Date },
  gracePeriodEnd: { type: Date },
  paymentDetails: {
    amount: { type: Number },
    currency: { type: String },
    stripeSessionId: { type: String },
    paymentStatus: { type: String },
    createdAt: { type: Date, default: Date.now },
  },
  renewals: [
    {
      amount: { type: Number },
      transactionId: { type: String },
      renewalDate: { type: Date, default: Date.now },
      paymentDetails: { type: Object },
    },
  ],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Add index for expiration checks
subscriptionSchema.index({ status: 1, endDate: 1 });

module.exports = mongoose.model("Subscription", subscriptionSchema);