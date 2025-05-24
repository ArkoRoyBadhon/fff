const express = require("express");
const router = express.Router();
const { protect, authorize } = require("../middleware/authMiddleware");
const { isAdmin } = require("../middleware/adminMiddleware");
const {
  getNotifications,
  deleteNotification,
  markNotificationAsRead,
} = require("../controller/notificationController");

// Routes for all authenticated users (admin, seller, buyer)
router.get("/", protect, getNotifications);
router.delete("/:notificationId", protect, deleteNotification);
router.put("/:notificationId/read", protect, markNotificationAsRead);

module.exports = router;
