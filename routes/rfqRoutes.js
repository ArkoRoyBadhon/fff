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
  getRFQByIdAdmin,
  updateRFQAdmin,
} = require("../controller/RFQController");
const { protect } = require("../middleware/authMiddleware");
const { isAdmin } = require("../middleware/adminMiddleware");

router.post("/", protect, createRFQ);

router.get("/", getAllRFQs);

router.get("/user", protect, getAllRFQsByUser);
// router.get("/admin", isAdmin, getAllRFQsByUser);
router.get("/user-quotation", protect, getAllRFQsBySellerQuotation);

router.get("/admin/:id", isAdmin, getRFQByIdAdmin);
router.get("/:id", getRFQById);

router.put("/:id", protect, updateRFQ);
router.put("/admin/:id", isAdmin, updateRFQAdmin);

router.delete("/:id", protect, deleteRFQ);
router.delete("/admin/:id", isAdmin, deleteRFQ);

module.exports = router;
