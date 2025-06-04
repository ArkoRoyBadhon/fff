const mongoose = require("mongoose");

const variantSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    options: [
      {
        value: {
          type: String,
          required: true,
          trim: true,
        },
        priceAdjustment: {
          type: Number,
          default: 0,
          required: true,
        },

        colorType: {
          type: String,
          enum: ["name", "image"],
          required: function () {
            return this.name === "color";
          },
        },
        image: {
          type: String,
          required: function () {
            return this.name === "color" && this.colorType === "image";
          },
          trim: true,
        },
        isDefault: {
          type: Boolean,
          default: false,
        },
      },
    ],
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

const productSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      unique: true,
      required: true,
    },
    about: {
      type: String,
      required: false,
    },
    description: {
      type: String,
      required: false,
    },
    slug: {
      type: String,
      required: true,
      unique: false,
    },
    sku: {
      type: String,
      required: true,
      unique: false,
    },
    barcode: {
      type: String,
      required: false,
    },
    categories: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Category",
        required: false,
      },
    ],
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: false,
    },
    subCategory: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "SubCategory",
      },
    ],
    subSubCategory: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "SubSubCategory",
      },
    ],
    catalog: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Catalog",
      required: false,
    },
    minOrder: {
      type: Number,
      required: false,
      default: 1,
    },
    image: {
      type: Array,
      required: false,
    },
    tag: [String],
    status: {
      type: String,
      default: "show",
      enum: ["show", "hide"],
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    salePrice: {
      type: Number,
      required: false,
      min: 0,
    },
    attributes: [
      {
        key: String,
        value: String,
      },
    ],
    variants: {
      type: [variantSchema],
      default: [],
    },
    stock: {
      type: Number,
      default: 0,
    },
    seller: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    sales: {
      type: Number,
      default: 0,
    },
    paidSample: {
      type: Boolean,
      default: false,
    },
    rating: {
      average: { type: Number, default: 0 },
      count: { type: Number, default: 0 },
    },
    sold: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

productSchema.virtual("finalPrice").get(function () {
  return this.salePrice || this.price;
});

productSchema.virtual("variantPrices").get(function () {
  return this.variants.map((variant) => ({
    variantId: variant._id,
    name: variant.name,
    value: variant.value,
    price: this.finalPrice + variant.priceAdjustment,
    originalPrice: this.price + variant.priceAdjustment,
  }));
});

const Product = mongoose.model("Product", productSchema);
module.exports = Product;
