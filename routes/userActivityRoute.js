const express = require("express");
const {
  logSearch,
  logCategoryClick,
  getUserActivity,
} = require("../controller/userActivityController");

const router = express.Router();

router.post("/log-search", logSearch);
router.post("/log-category-click", logCategoryClick);
router.get("/:ipAddress", getUserActivity);

module.exports = router;
