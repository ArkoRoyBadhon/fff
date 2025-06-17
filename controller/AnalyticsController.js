const Advertisement = require("../models/Advertisement");

// Record an impression
exports.recordImpression = async (req, res) => {
  try {
    const ad = await Advertisement.findById(req.params.id);
    if (!ad) {
      return res.status(404).json({ message: "Advertisement not found" });
    }

    ad.recordImpression();
    await ad.save();

    res.status(200).json({
      message: "Impression recorded",
      ad: {
        id: ad._id,
        impressions: ad.impressions,
        clicks: ad.clicks,
        ctr: ad.ctr,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Record a click
exports.recordClick = async (req, res) => {
  try {
    const ad = await Advertisement.findById(req.params.id);
    if (!ad) {
      return res.status(404).json({ message: "Advertisement not found" });
    }

    ad.recordClick({});
    await ad.save();

    res.status(200).json({
      message: "Click recorded",
      ad: {
        id: ad._id,
        impressions: ad.impressions,
        clicks: ad.clicks,
        ctr: ad.ctr,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get advertisement metrics
exports.getMetrics = async (req, res) => {
  try {
    const ad = await Advertisement.findById(req.params.id);
    if (!ad) {
      return res.status(404).json({ message: "Advertisement not found" });
    }

    res.status(200).json({
      overall: {
        impressions: ad.impressions,
        clicks: ad.clicks,
        ctr: ad.ctr,
      },
      daily: ad.dailyMetrics,
      weekly: ad.weeklyMetrics,
      monthly: ad.monthlyMetrics,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get metrics by time period
exports.getMetricsByPeriod = async (req, res) => {
  try {
    const { period } = req.params; // 'daily', 'weekly', or 'monthly'
    const ad = await Advertisement.findById(req.params.id);

    if (!ad) {
      return res.status(404).json({ message: "Advertisement not found" });
    }

    let metrics;
    switch (period) {
      case "daily":
        metrics = ad.dailyMetrics;
        break;
      case "weekly":
        metrics = ad.weeklyMetrics;
        break;
      case "monthly":
        metrics = ad.monthlyMetrics;
        break;
      default:
        return res.status(400).json({ message: "Invalid period specified" });
    }

    res.status(200).json({
      period,
      metrics,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
