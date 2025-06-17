const express = require("express");
const router = express.Router();
const { protect, authorize } = require("../middleware/authMiddleware");
const { isAdmin } = require("../middleware/adminMiddleware");

const {
  createPaymentIntent,
  handlePaymentSuccess,
  assignFreePackage,
  getSubscriptions,
  getActiveSubscription,
  getPaymentMethods,
} = require("../controller/subscriptionController");
const {
  getPackages,
  createPackage,
  updatePackage,
  deletePackage,
} = require("../controller/packageController");
const {
  getFeatures,
  manageFeature,
  deleteFeature,
} = require("../controller/featureController");

router.get("/packages", getPackages);
router.post("/packages/create", protect, isAdmin, createPackage);
router.post("/packages/update", protect, isAdmin, updatePackage);
router.delete("/packages/:id", protect, isAdmin, deletePackage);
router.get("/features", protect, isAdmin, getFeatures);
router.post("/features", protect, isAdmin, manageFeature);
router.post("/features/update", protect, isAdmin, manageFeature);
router.delete("/features/:id", protect, isAdmin, deleteFeature);
router.post(
  "/payment-intent",
  protect,
  authorize("seller", "admin"),
  createPaymentIntent
);
router.post("/success", protect, authorize("seller"), handlePaymentSuccess);
router.post("/assign-free", protect, authorize("seller"), assignFreePackage);
router.get("/", protect, isAdmin, getSubscriptions);
router.get("/active", protect, authorize("seller"), getActiveSubscription);
router.get("/payment-methods", protect, authorize("seller"), getPaymentMethods);

module.exports = router;