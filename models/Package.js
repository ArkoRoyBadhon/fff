const mongoose = require("mongoose");

const packageSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  price: {
    type: Number,
    required: true,
    min: 0,
  },
  currency: {
    type: String,
    default: "usd",
  },
  conditions: {
    maxCatalogs: {
      type: Number,
      default: 0,
      min: 0,
    },
    maxProductsPerCatalog: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  features: [
    {
      type: String,
      trim: true,
    },
  ],
  discount: {
    type: Number,
    default: 0,
    min: 0,
    max: 100,
  },
  description: {
    type: String,
    trim: true,
  },
  duration: {
    value: {
      type: Number,
      min: 1,
      default: 1,
      
    },
    unit: {
      type: String,
      enum: ["minutes", "months", "years"],
      required: true,
      default: "minutes",
    },
  },
  type: {
    type: String,
    enum: ["free", "paid"],
    default: "paid",
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Package", packageSchema);
