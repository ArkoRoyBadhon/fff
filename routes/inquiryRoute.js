const express = require("express");
const router = express.Router();
const inquiryController = require("../controller/inquiryController");
const { protect } = require("../middleware/authMiddleware");
const { isAdmin } = require("../middleware/adminMiddleware");

router.post("/", inquiryController.createInquiry);

router.post("/:inquiryId/messages", inquiryController.addMessage);

router.get("/buyer/:buyerId", inquiryController.getBuyerInquiries);

router.get("/seller/:sellerId", inquiryController.getSellerInquiries);
router.get("/admin-chats", inquiryController.getAdminInquiries);

router.get("/:inquiryId", protect, inquiryController.getInquiry);
router.get("/admin/:inquiryId", isAdmin, inquiryController.getAdminInquiry);

router.patch("/:inquiryId/close", inquiryController.closeInquiry);
router.post("/:sellerId/seller", inquiryController.getChatBySeller);

module.exports = router;
