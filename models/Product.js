const mongoose = require("mongoose");

const variantSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    enum: ["size", "color", "weight", "material"],
  },
  value: {
    type: String,
    required: true,
  },
  priceAdjustment: {
    type: Number,
    default: 0,
    required: true,
  },
  skuSuffix: {
    type: String,
    required: false,
  },
  stock: {
    type: Number,
    default: 0,
  },
  isDefault: {
    type: Boolean,
    default: false,
  },
});

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
    catalog: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Catalog",
      required: false,
    },
    minOrder: {
      type: Number,
      required: false,
      default: 10,
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
      default: [
        {
          name: "base",
          value: "default",
          priceAdjustment: 0,
          isDefault: true,
        },
      ],
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
