const mongoose = require("mongoose");

const catalogSchema = new mongoose.Schema({
  storeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Store",
    required: true,
  },
  sellerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  catalogName: {
    type: String,
    required: true,
  },
  categories: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
    },
  ],
  subCategories: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SubCategory",
    },
  ],
  subSubCategories: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SubSubCategory",
    },
  ],
  image: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    enum: ["pending", "deactive", "approved", "rejected"],
    default: "pending",
  },
  isArchived: {
    type: Boolean,
    default: false,
  },
  rejectionReasons: [
    {
      field: { type: String },
      reason: { type: String },
    },
  ],
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Catalog", catalogSchema);