const express = require("express");

const {
  addModification,
  updateModificationStatus,
  getModifications,
} = require("../controller/customerOrderController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/add", protect, addModification);
router.get("/get/:id", protect, getModifications);
router.patch(
  "/:orderId/update/:modificationId",
  protect,
  updateModificationStatus
);
router.get("/", async (req, res) => {
  res.status(200).json({ success: true });
});

module.exports = router;
