const Advertisement = require("../models/Advertisement");
const Product = require("../models/Product");
const StoreSetup = require("../models/StoreSetup");
const Subscription = require("../models/Subscription");
const Transaction = require("../models/Transactions");
const User = require("../models/User");

// Record an impression
const recordImpression = async (req, res) => {
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
const recordClick = async (req, res) => {
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
const getMetrics = async (req, res) => {
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
const getMetricsByPeriod = async (req, res) => {
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

// admin stats
const getAdminStats = async (req, res) => {
  try {
    const totalSubscriber = await Subscription.countDocuments();

    let totalSumSubscriber = await Subscription.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: "$paymentDetails.amount" },
        },
      },
    ]);
    totalSumSubscriber = totalSumSubscriber[0]?.total || 0;

    const totalSeller = await User.countDocuments({ role: "seller" });

    let Adrevenue = await Advertisement.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: "$totalSpent" },
        },
      },
    ]);
    const totalAdRevenue = Adrevenue[0]?.total || 0;

    // all times sales
    let allTimeSales = await Transaction.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: "$amount" },
        },
      },
    ]);
    allTimeSales = allTimeSales[0]?.total || 0;

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    let last30DaysSales = await Transaction.aggregate([
      {
        $match: {
          createdAt: { $gte: thirtyDaysAgo },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$amount" },
        },
      },
    ]);

    last30DaysSales = last30DaysSales[0]?.total || 0;

    // new business

    let approvedStoresLast30Days = await StoreSetup.aggregate([
      {
        $match: {
          status: "approved",
          createdAt: { $gte: thirtyDaysAgo },
        },
      },
      {
        $count: "approvedCount",
      },
    ]);

    approvedStoresLast30Days = approvedStoresLast30Days[0]?.approvedCount || 0;

    // comission
    const comission = await Transaction.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: "$commision" },
        },
      },
    ]);
    const totalComission = comission[0]?.total || 0;

    // ============= yearly revenue
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    let yearlyStats = {};

    // Yearly transaction revenue
    let yearlyTransactionRevenue = await Transaction.aggregate([
      {
        $match: {
          createdAt: { $gte: oneYearAgo },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$commission" },
        },
      },
    ]);
    yearlyStats.transactionRevenue = yearlyTransactionRevenue[0]?.total || 0;

    // Yearly ad revenue
    let yearlyAdRevenue = await Advertisement.aggregate([
      {
        $match: {
          createdAt: { $gte: oneYearAgo },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$totalSpent" },
        },
      },
    ]);
    yearlyStats.adRevenue = yearlyAdRevenue[0]?.total || 0;

    // Yearly subscription revenue
    let yearlySubscriptionRevenue = await Subscription.aggregate([
      {
        $match: {
          "paymentDetails.createdAt": { $gte: oneYearAgo },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$paymentDetails.amount" },
        },
      },
    ]);
    yearlyStats.subscriptionRevenue = yearlySubscriptionRevenue[0]?.total || 0;

    // Total yearly revenue (sum of all sources)
    yearlyStats.totalRevenue =
      yearlyStats.transactionRevenue +
      yearlyStats.adRevenue +
      yearlyStats.subscriptionRevenue;

    const stats = {
      totalSubscriber,
      totalSubscriptionRevenue: totalSumSubscriber,
      totalSeller,
      totalAdRevenue,
      allTimeSales,
      last30DaysSales,
      approvedStoresLast30Days,
      totalComission,
      yearlyStats,
    };

    res.status(200).json({
      data: stats,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getAdminRevenueStats = async (req, res) => {
  try {
    const today = new Date();

    // Define time ranges
    const startOfToday = new Date(today.setHours(0, 0, 0, 0));
    const oneWeekAgo = new Date(startOfToday);
    oneWeekAgo.setDate(startOfToday.getDate() - 7);

    const oneMonthAgo = new Date(startOfToday);
    oneMonthAgo.setMonth(startOfToday.getMonth() - 1);

    const oneYearAgo = new Date(startOfToday);
    oneYearAgo.setFullYear(startOfToday.getFullYear() - 1);

    // Function to calculate stats for a given period
    const calculateStats = async (startDate) => {
      // Transaction revenue
      const transactionRevenueResult = await Transaction.aggregate([
        { $match: { createdAt: { $gte: startDate } } },
        {
          $group: {
            _id: null,
            total: { $sum: "$commission" },
          },
        },
      ]);
      const transactionRevenue = transactionRevenueResult[0]?.total || 0;

      // Ad revenue (based on daily/monthly metrics)
      const ads = await Advertisement.find({ createdAt: { $gte: startDate } });
      let adRevenue = 0;
      ads.forEach((ad) => {
        const adMetrics =
          startDate >= oneMonthAgo
            ? ad.monthlyMetrics
            : ad.dailyMetrics.filter((metric) => metric.date >= startDate);

        const totalImpressions = adMetrics.reduce(
          (sum, metric) => sum + metric.impressions,
          0
        );
        adRevenue += totalImpressions * ad.pricePerImpression;
      });

      // Subscription revenue
      const subscriptionRevenueResult = await Subscription.aggregate([
        { $match: { "paymentDetails.createdAt": { $gte: startDate } } },
        {
          $group: {
            _id: null,
            total: { $sum: "$paymentDetails.amount" },
          },
        },
      ]);
      const subscriptionRevenue = subscriptionRevenueResult[0]?.total || 0;

      // Total revenue
      const totalRevenue = transactionRevenue + adRevenue + subscriptionRevenue;

      return {
        transactionRevenue,
        adRevenue,
        subscriptionRevenue,
        totalRevenue,
      };
    };

    // Calculate stats
    const dailyStats = await calculateStats(startOfToday);
    const weeklyStats = await calculateStats(oneWeekAgo);
    const monthlyStats = await calculateStats(oneMonthAgo);
    const yearlyStats = await calculateStats(oneYearAgo);

    // Send response
    res.status(200).json({
      dailyStats,
      weeklyStats,
      monthlyStats,
      yearlyStats,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getAdminRevenueTrends = async (req, res) => {
  try {
    const today = new Date();
    const currentYear = today.getFullYear();

    // Helper function to get month name
    const getMonthName = (monthIndex) => {
      const months = [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec",
      ];
      return months[monthIndex];
    };

    // Helper function to get week number
    const getWeekNumber = (date) => {
      const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
      const pastDaysOfYear = (date - firstDayOfYear) / 86400000;
      return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
    };

    // Yearly Data (12 months)
    const yearlyData = [];
    for (let month = 0; month < 12; month++) {
      const startDate = new Date(currentYear, month, 1);
      const endDate = new Date(currentYear, month + 1, 0);

      // Transaction revenue (b2b)
      const transactionRevenue = await Transaction.aggregate([
        {
          $match: {
            createdAt: {
              $gte: startDate,
              $lte: endDate,
            },
          },
        },
        { $group: { _id: null, total: { $sum: "$commission" } } },
      ]);
      const b2b = transactionRevenue[0]?.total || 0;

      // Ad revenue
      const ads = await Advertisement.find({
        createdAt: { $gte: startDate, $lte: endDate },
      });
      let ad = 0;
      ads.forEach((adDoc) => {
        const monthlyImpressions = adDoc.monthlyMetrics.reduce(
          (sum, metric) => sum + metric.impressions,
          0
        );
        ad += monthlyImpressions * adDoc.pricePerImpression;
      });

      // Subscription revenue
      const subscriptionRevenue = await Subscription.aggregate([
        {
          $match: {
            "paymentDetails.createdAt": {
              $gte: startDate,
              $lte: endDate,
            },
          },
        },
        { $group: { _id: null, total: { $sum: "$paymentDetails.amount" } } },
      ]);
      const sub = subscriptionRevenue[0]?.total || 0;

      yearlyData.push({
        period: getMonthName(month),
        ad: Math.round(ad),
        sub: Math.round(sub),
        b2b: Math.round(b2b),
      });
    }

    // Monthly Data (4 weeks)
    const monthlyData = [];
    const currentMonth = today.getMonth();
    const startOfMonth = new Date(currentYear, currentMonth, 1);

    for (let week = 1; week <= 4; week++) {
      let weekStart = new Date(startOfMonth);
      weekStart.setDate(1 + (week - 1) * 7);

      let weekEnd = new Date(startOfMonth);
      weekEnd.setDate(1 + week * 7);
      weekEnd.setDate(weekEnd.getDate() - 1); // End of week

      if (weekEnd > today) weekEnd = new Date(today);

      // Transaction revenue (b2b)
      const transactionRevenue = await Transaction.aggregate([
        {
          $match: {
            createdAt: {
              $gte: weekStart,
              $lte: weekEnd,
            },
          },
        },
        { $group: { _id: null, total: { $sum: "$commission" } } },
      ]);
      const b2b = transactionRevenue[0]?.total || 0;

      // Ad revenue
      const ads = await Advertisement.find({
        createdAt: { $gte: weekStart, $lte: weekEnd },
      });
      let ad = 0;
      ads.forEach((adDoc) => {
        const weeklyMetrics = adDoc.dailyMetrics.filter(
          (metric) => metric.date >= weekStart && metric.date <= weekEnd
        );
        const weeklyImpressions = weeklyMetrics.reduce(
          (sum, metric) => sum + metric.impressions,
          0
        );
        ad += weeklyImpressions * adDoc.pricePerImpression;
      });

      // Subscription revenue
      const subscriptionRevenue = await Subscription.aggregate([
        {
          $match: {
            "paymentDetails.createdAt": {
              $gte: weekStart,
              $lte: weekEnd,
            },
          },
        },
        { $group: { _id: null, total: { $sum: "$paymentDetails.amount" } } },
      ]);
      const sub = subscriptionRevenue[0]?.total || 0;

      monthlyData.push({
        period: `Week ${week}`,
        ad: Math.round(ad),
        sub: Math.round(sub),
        b2b: Math.round(b2b),
      });
    }

    // Weekly Data (7 days)
    const weekData = [];
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    for (let day = 0; day < 7; day++) {
      const dayStart = new Date(today);
      dayStart.setDate(today.getDate() - (6 - day));
      dayStart.setHours(0, 0, 0, 0);

      const dayEnd = new Date(dayStart);
      dayEnd.setHours(23, 59, 59, 999);

      // Transaction revenue (b2b)
      const transactionRevenue = await Transaction.aggregate([
        {
          $match: {
            createdAt: {
              $gte: dayStart,
              $lte: dayEnd,
            },
          },
        },
        { $group: { _id: null, total: { $sum: "$commission" } } },
      ]);
      const b2b = transactionRevenue[0]?.total || 0;

      // Ad revenue
      const ads = await Advertisement.find({
        createdAt: { $gte: dayStart, $lte: dayEnd },
      });
      let ad = 0;
      ads.forEach((adDoc) => {
        const dailyMetric = adDoc.dailyMetrics.find(
          (metric) => metric.date.toDateString() === dayStart.toDateString()
        );
        if (dailyMetric) {
          ad += dailyMetric.impressions * adDoc.pricePerImpression;
        }
      });

      // Subscription revenue
      const subscriptionRevenue = await Subscription.aggregate([
        {
          $match: {
            "paymentDetails.createdAt": {
              $gte: dayStart,
              $lte: dayEnd,
            },
          },
        },
        { $group: { _id: null, total: { $sum: "$paymentDetails.amount" } } },
      ]);
      const sub = subscriptionRevenue[0]?.total || 0;

      weekData.push({
        period: days[dayStart.getDay()],
        ad: Math.round(ad),
        sub: Math.round(sub),
        b2b: Math.round(b2b),
      });
    }

    res.status(200).json({
      yearData: yearlyData,
      monthData: monthlyData,
      weekData: weekData,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getWeeklyRevenue = async (req, res) => {
  try {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const today = new Date();

    // Weekly Commission Revenue
    const weeklyCommission = await Transaction.aggregate([
      {
        $match: {
          createdAt: { $gte: sevenDaysAgo, $lte: today },
        },
      },
      {
        $group: {
          _id: { $dayOfWeek: "$createdAt" },
          total: { $sum: "$commission" },
        },
      },
    ]);

    // Weekly Ad Revenue
    const weeklyAdRevenue = await Advertisement.aggregate([
      {
        $match: {
          createdAt: { $gte: sevenDaysAgo, $lte: today },
        },
      },
      {
        $group: {
          _id: { $dayOfWeek: "$createdAt" },
          total: { $sum: "$totalSpent" },
        },
      },
    ]);

    // Weekly Subscription Revenue
    const weeklySubscriptionRevenue = await Subscription.aggregate([
      {
        $match: {
          "paymentDetails.createdAt": { $gte: sevenDaysAgo, $lte: today },
        },
      },
      {
        $group: {
          _id: { $dayOfWeek: "$paymentDetails.createdAt" },
          total: { $sum: "$paymentDetails.amount" },
        },
      },
    ]);

    // Map results to a consistent structure for bar chart data
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const mapToChartData = (data) => {
      const chartData = Array(7).fill(0); // Default values for 7 days
      data.forEach((item) => {
        const index = item._id - 1; // Day of the week (1=Sun, 7=Sat)
        chartData[index] = item.total;
      });
      return chartData;
    };

    const weeklyRevenueData = {
      commission: {
        labels: days,
        datasets: [
          {
            data: mapToChartData(weeklyCommission),
            backgroundColor: [
              "#1e293b",
              "#fbbf24",
              "#1e293b",
              "#fbbf24",
              "#1e293b",
              "#fbbf24",
              "#1e293b",
            ],
            borderRadius: 4,
          },
        ],
      },
      ad: {
        labels: days,
        datasets: [
          {
            data: mapToChartData(weeklyAdRevenue),
            backgroundColor: [
              "#1e293b",
              "#fbbf24",
              "#1e293b",
              "#fbbf24",
              "#1e293b",
              "#fbbf24",
              "#1e293b",
            ],
            borderRadius: 4,
          },
        ],
      },
      subscription: {
        labels: days,
        datasets: [
          {
            data: mapToChartData(weeklySubscriptionRevenue),
            backgroundColor: [
              "#1e293b",
              "#fbbf24",
              "#1e293b",
              "#fbbf24",
              "#1e293b",
              "#fbbf24",
              "#1e293b",
            ],
            borderRadius: 4,
          },
        ],
      },
    };

    res.status(200).json({
      data: weeklyRevenueData,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getBestSellingProducts = async (req, res) => {
  try {
    const products = await Product.aggregate([
      { $sort: { sold: -1 } },
      { $limit: 5 },
      { $project: { title: 1, sold: 1 } },
    ]);

    const labels = products.map((product) => product.title);
    const data = products.map((product) => product.sold);
    const backgroundColor = labels.map((_, index) =>
      index % 2 === 0 ? "#1e293b" : "#fbbf24"
    );

    const bestSellingData = {
      labels,
      datasets: [
        {
          data,
          backgroundColor,
          borderRadius: 4,
        },
      ],
    };

    return res.status(200).json({
      success: true,
      data: bestSellingData,
    });
  } catch (error) {
    console.error("Error fetching best-selling products:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch best-selling products.",
      error: error.message,
    });
  }
};

module.exports = {
  recordImpression,
  recordClick,
  getMetrics,
  getMetricsByPeriod,
  getAdminStats,
  getWeeklyRevenue,
  getBestSellingProducts,
  getAdminRevenueStats,
  getAdminRevenueTrends,
};
