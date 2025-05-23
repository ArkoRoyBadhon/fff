const express = require("express");
const router = express.Router();
const {
  register,
  login,
  getUserProfile,
  getSupplierInfo,
  updateProfile,
} = require("../controller/authController");
const {
  protect,
  authorize,
  requirePremium,
} = require("../middleware/authMiddleware");

router.post("/register", register);
router.post("/login", login);
router.get("/profile", protect, getUserProfile);
router.get("/supplier/:seller", getSupplierInfo);
router.patch("/profile/update", protect, updateProfile);

router.get("/seller/dashboard", protect, authorize("seller"), (req, res) => {
  res.json({ message: "Seller dashboard" });
});

router.get(
  "/seller/premium-features",
  protect,
  authorize("seller"),
  requirePremium,
  (req, res) => {
    res.json({ message: "Premium features accessed successfully" });
  }
);

router.get("/buyer/dashboard", protect, authorize("buyer"), (req, res) => {
  res.json({ message: "Buyer dashboard" });
});

module.exports = router;
