const express = require("express");
const {
  createInquiry,
  getAllInquiries,
  getInquiryById,
  updateInquiryStatus,
} = require("../controller/inquiryListController");
const { isAdmin } = require("../middleware/adminMiddleware");
const router = express.Router();

router.post("/", createInquiry);

router.get("/", isAdmin, getAllInquiries);

router.get("/:id", isAdmin, getInquiryById);

router.patch("/:id/status", isAdmin, updateInquiryStatus);

module.exports = router;
