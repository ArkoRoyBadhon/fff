const mongoose = require("mongoose");

const reviewSchema = new mongoose.Schema(
  {
    comment: {
      type: String,
      required: true,
    },
    rating: {
      type: Number,
      required: false,
      min: [0, "Rating must be at least 1"],
      max: [5, "Rating must not exceed 5"],
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

const Review = mongoose.model("Review", reviewSchema);

module.exports = Review;
