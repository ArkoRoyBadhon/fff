const express = require("express");
const router = express.Router();
const {
  createQuotation,
  updateQuotation,
  deleteQuotation,
  getAllQuotationsByRFQ,
} = require("../controller/QuotationController");
const { protect, authorize } = require("../middleware/authMiddleware");
const { isAdmin } = require("../middleware/adminMiddleware");

router.post("/", protect, authorize("seller"), createQuotation);

router.get("/rfq/:rfqId", protect, getAllQuotationsByRFQ);
router.get("/rfq-admin/:rfqId", isAdmin, getAllQuotationsByRFQ);

router.put("/:id", protect, updateQuotation);

router.delete("/:id", protect, deleteQuotation);

module.exports = router;
