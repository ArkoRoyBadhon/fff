const Product = require("../models/Product");
const Review = require("../models/Reviews");

const addReview = async (req, res) => {
  try {
    // rating,
    //     comment: reviewText,
    //     user: user?._id,
    //     order: order?._id,
    //     product: order?.product?._id,
    const { product, rating } = req.body;

    if (rating <= 0) {
      return res.status(400).send({ message: "Rating must be greater than 0" });
    }

    const newReview = new Review({
      ...req.body,
      user: req.user._id,
      product: product,
    });
    await newReview.save();

    const reviews = await Review.find({
      product: product,
      rating: { $gt: 0 },
    });
    const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
    const averageRating = totalRating / reviews.length;
    const reviewCount = reviews.length;

    await Product.findByIdAndUpdate(product, {
      $set: {
        "rating.average": averageRating,
        "rating.count": reviewCount,
      },
    });

    res.status(200).send({
      message: "Review saved successfully",
      averageRating,
      reviewCount,
    });
  } catch (err) {
    res.status(500).send({
      message: err.message,
    });
  }
};

const getReviews = async (req, res) => {
  const reviews = await Review.find({ product: req.params.productId })
    .populate("product")
    .populate("user");
  res.send(reviews);
};

const getReviewByOrder = async (req, res) => {
  const id = req.params.id;
  const reviews = await Review.find({ order: id }).populate(
    "user",
    "firstName lastName"
  );
  res.send(reviews);
};

module.exports = {
  addReview,
  getReviews,
  getReviewByOrder,
};
