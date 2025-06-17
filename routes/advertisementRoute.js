const express = require("express");
const {
  createAdvertisement,
  updateAdvertisement,
  deleteAdvertisement,
  getAllAdvertisements,
  getAdvertisementsBySeller,
  getAllAdvertisementsForAdmin,
  getAdvertisement,
  updateAdvertisementAdmin,
  getActiveAdvertisementsStats,
} = require("../controller/AdvertisementController");
const { protect } = require("../middleware/authMiddleware");
const { isAdmin } = require("../middleware/adminMiddleware");

const router = express.Router();

router.post("/", protect, createAdvertisement);

router.put("/:id", protect, updateAdvertisement);
router.put("/admin/:id", isAdmin, updateAdvertisementAdmin);

router.delete("/:id", protect, deleteAdvertisement);

router.get("/", getAllAdvertisements);

router.get("/seller", protect, getAdvertisementsBySeller);

router.get("/admin", getAllAdvertisementsForAdmin);
router.get(
  "/get-active-advertisementstats",
  protect,
  getActiveAdvertisementsStats
);

router.get("/:id", getAdvertisement);

module.exports = router;
