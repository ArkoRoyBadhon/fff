const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  packageId: { type: mongoose.Schema.Types.ObjectId, ref: 'Package', required: true },
  transactionId: { type: String, default: null },
  status: { type: String, enum: ['active', 'pending', 'canceled'], default: 'pending' },
  startDate: { type: Date, deCfault: Date.now },
  endDate: { type: Date },
  paymentDetails: {
    amount: { type: Number },
    currency: { type: String },
    stripeSessionId: { type: String },
    paymentStatus: { type: String },
    createdAt: { type: Date, default: Date.now },
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Subscription', subscriptionSchema);