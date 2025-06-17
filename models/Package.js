const mongoose = require("mongoose");

const packageSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true, 
    unique: true,
    trim: true
  },
  price: { 
    type: Number, 
    required: true,
    min: 0
  },
  currency: { 
    type: String, 
    default: "usd" 
  },
  conditions: {
    maxCatalogs: { 
      type: Number, 
      default: 0,
      min: 0
    },
    maxProductsPerCatalog: { 
      type: Number, 
      default: 0,
      min: 0
    },
  },
  features: [{
    type: String,
    trim: true
  }],
  discount: { 
    type: Number, 
    default: 0,
    min: 0,
    max: 100
  },
  description: {
    type: String,
    trim: true
  },
  isActive: { 
    type: Boolean, 
    default: true 
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
  updatedAt: { 
    type: Date, 
    default: Date.now 
  },
});

module.exports = mongoose.model("Package", packageSchema);