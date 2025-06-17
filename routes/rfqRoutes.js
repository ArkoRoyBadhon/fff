const express = require("express");
const router = express.Router();
const {
  createRFQ,
  getAllRFQs,
  getAllRFQsByUser,
  getRFQById,
  updateRFQ,
  deleteRFQ,
  getAllRFQsBySellerQuotation,
} = require("../controller/RFQController");
const { protect } = require("../middleware/authMiddleware");

router.post("/", protect, createRFQ);

router.get("/", getAllRFQs);

router.get("/user", protect, getAllRFQsByUser);
router.get("/user-quotation", protect, getAllRFQsBySellerQuotation);

router.get("/:id", getRFQById);

router.put("/:id", protect, updateRFQ);

router.delete("/:id", protect, deleteRFQ);

module.exports = router;
