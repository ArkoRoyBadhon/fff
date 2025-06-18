const express = require("express");
const {
  recordImpression,
  recordClick,
  getMetrics,
  getMetricsByPeriod,
  getAdminStats,
  getWeeklyRevenue,
  getBestSellingProducts,
  getAdminRevenueStats,
  getAdminRevenueTrends,
} = require("../controller/AnalyticsController");
const router = express.Router();

// Record metrics
router.post("/:id/impression", recordImpression);
router.post("/:id/click", recordClick);

// Get metrics
router.get("/:id/metrics", getMetrics);
router.get("/:id/metrics/:period", getMetricsByPeriod);
router.get("/admin-dashboard-stats", getAdminStats);
router.get("/admin-revenue-stats", getAdminRevenueStats);
router.get("/getWeeklyRevenue", getWeeklyRevenue);
router.get("/getBestSellingProducts", getBestSellingProducts);
router.get("/getAdminRevenueTrends", getAdminRevenueTrends);

module.exports = router;
