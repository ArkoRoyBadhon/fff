const mongoose = require("mongoose");

// SubSubCategory Schema
const subSubCategorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

const SubSubCategory = mongoose.model("SubSubCategory", subSubCategorySchema);

// SubCategory Schema
const subCategorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    subSubCategories: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "SubSubCategory",
      },
    ],
  },
  {
    timestamps: true,
  }
);

const SubCategory = mongoose.model("SubCategory", subCategorySchema);

// Category Schema
const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    image: {
      type: String,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    subCategories: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "SubCategory",
      },
    ],
  },
  {
    timestamps: true,
  }
);

const Category = mongoose.model("Category", categorySchema);

// Exporting Models
module.exports = {
  Category,
  SubCategory,
  SubSubCategory,
};
