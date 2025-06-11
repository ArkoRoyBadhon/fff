const express = require("express");
const router = express.Router();
const {
  createQuotation,
  updateQuotation,
  deleteQuotation,
  getAllQuotationsByRFQ,
} = require("../controller/QuotationController");
const { protect, authorize } = require("../middleware/authMiddleware");

router.post("/", protect, authorize("seller"), createQuotation);

router.get("/rfq/:rfqId", protect, getAllQuotationsByRFQ);

router.put("/:id", protect, updateQuotation);

router.delete("/:id", protect, deleteQuotation);

module.exports = router;
