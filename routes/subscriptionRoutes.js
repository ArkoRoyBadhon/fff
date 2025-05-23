const express = require("express");
const router = express.Router();
const {
  requestSubscription,
  getSubscriptionRequests,
  manageSubscription,
} = require("../controller/subscriptionController");
const { protect, authorize } = require("../middleware/authMiddleware");
const { isAdmin } = require("../middleware/adminMiddleware");

router.post("/request", protect, authorize("seller"), requestSubscription);
router.get("/", isAdmin, getSubscriptionRequests);
router.put("/:id", isAdmin, manageSubscription);

module.exports = router;