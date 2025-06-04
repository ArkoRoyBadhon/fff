const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const { isAdmin } = require("../middleware/adminMiddleware");
const {
  addDispute,
  getOrderDisputes,
  updateDisputeStatus,
} = require("../controller/disputeController");

router.post("/add", protect, addDispute);
router.get("/get/:orderId", protect, getOrderDisputes);
router.patch("/update/:disputeId", isAdmin, updateDisputeStatus);

module.exports = router;
