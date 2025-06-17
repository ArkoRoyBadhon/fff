const express = require("express");
const { getAnalyticsData } = require("../controller/AnalyticsController");

const router = express.Router();

router.get("/analytics", async (req, res) => {
  try {
    const data = await getAnalyticsData();
    res.status(200).json(data);
  } catch (error) {
    // console.error("Error fetching analytics data:", error);
    // res.status(500).json({ error: "Failed to fetch analytics data" });
    res.status(500).json({ error: error });
  }
});

module.exports = router;
