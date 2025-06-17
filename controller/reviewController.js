const Product = require("../models/Product");
const Review = require("../models/Reviews");
const StoreSetup = require("../models/StoreSetup");

const addReview = async (req, res) => {
  try {
    const { product, rating } = req.body;
    console.log("req.body", req.body);

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

    const updatedProduct = await Product.findByIdAndUpdate(product, {
      $set: {
        "rating.average": averageRating,
        "rating.count": reviewCount,
      },
    });

    console.log("updatedProduct", updatedProduct);

    // If product has a seller/store, update store rating
    if (updatedProduct.seller) {
      // Get all products from this seller
      const sellerProducts = await Product.find({
        seller: updatedProduct.seller,
      });

      // Get all reviews for these products
      const sellerProductIds = sellerProducts.map((p) => p._id);
      const sellerReviews = await Review.find({
        product: { $in: sellerProductIds },
        rating: { $gt: 0 },
      });

      // Calculate store average rating
      const storeTotalRating = sellerReviews.reduce(
        (sum, review) => sum + review.rating,
        0
      );
      const storeAverageRating = storeTotalRating / sellerReviews.length;
      const storeReviewCount = sellerReviews.length;

      console.log(
        "storeAverageRating",
        storeAverageRating,
        "storeReviewCount",
        storeReviewCount
      );

      await StoreSetup.findOneAndUpdate(
        { sellerId: updatedProduct.seller },
        {
          $set: {
            "rating.average": storeAverageRating,
            "rating.count": storeReviewCount,
          },
        }
      );
    }

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
