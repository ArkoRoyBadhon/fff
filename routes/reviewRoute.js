const express = require("express");
const {
  addReview,
  getReviews,
  getReviewByOrder,
} = require("../controller/reviewController");
const { protect } = require("../middleware/authMiddleware");
const router = express.Router();

router.post("/add", protect, addReview);
router.get("/get/:productId", getReviews);
router.get("/get-by-order/:id", getReviewByOrder);

module.exports = router;
