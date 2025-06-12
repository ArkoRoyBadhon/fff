const express = require("express");
const {
  recordImpression,
  recordClick,
  getMetrics,
  getMetricsByPeriod,
} = require("../controller/AnalyticsController");
const router = express.Router();

// Record metrics
router.post("/:id/impression", recordImpression);
router.post("/:id/click", recordClick);

// Get metrics
router.get("/:id/metrics", getMetrics);
router.get("/:id/metrics/:period", getMetricsByPeriod);

module.exports = router;
