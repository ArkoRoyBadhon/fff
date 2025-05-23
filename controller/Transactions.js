const mongoose = require("mongoose");
const Transaction = require("../models/Transactions");

const createTransaction = async (req, res) => {
  try {
    const {
      user,
      order,
      currency,
      paymentMethod,
      amount,
      description,
      reference,
    } = req.body;

    if (!user || !paymentMethod || !amount) {
      return res
        .status(400)
        .json({ error: "User, payment method, and amount are required" });
    }

    const transaction = await Transaction.create({
      user,
      order,
      currency,
      paymentMethod,
      amount,
      description,
      reference,
    });

    res.status(201).json(transaction);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getTransactionsByUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    if (!userId) {
      return res.status(400).json({ error: "User ID is required" });
    }

    const skip = (page - 1) * limit;

    // Paginated transactions
    const transactions = await Transaction.find({ user: userId })
      .populate({
        path: "order",
        populate: {
          path: "product",
        },
      })
      .sort({ createdAt: -1 })
      .skip(parseInt(skip))
      .limit(parseInt(limit));

    // Total transactions
    const totalTransactions = await Transaction.countDocuments({
      user: userId,
    });

    // Calculate date ranges for daily, weekly, and monthly transactions
    const currentDate = new Date();

    // Start of today
    const startOfDay = new Date(currentDate);
    startOfDay.setHours(0, 0, 0, 0);

    // Start of the week
    const startOfWeek = new Date(currentDate);
    startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    // Start of the month
    const startOfMonth = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth(),
      1
    );

    // Create aggregation pipelines for each time period
    const dailyAggregation = await Transaction.aggregate([
      {
        $match: {
          user: mongoose.Types.ObjectId(userId),
          createdAt: { $gte: startOfDay },
        },
      },
      {
        $group: {
          _id: null,
          count: { $sum: 1 },
          totalAmount: { $sum: "$amount" },
        },
      },
    ]);

    const weeklyAggregation = await Transaction.aggregate([
      {
        $match: {
          user: mongoose.Types.ObjectId(userId),
          createdAt: { $gte: startOfWeek },
        },
      },
      {
        $group: {
          _id: null,
          count: { $sum: 1 },
          totalAmount: { $sum: "$amount" },
        },
      },
    ]);

    const monthlyAggregation = await Transaction.aggregate([
      {
        $match: {
          user: mongoose.Types.ObjectId(userId),
          createdAt: { $gte: startOfMonth },
        },
      },
      {
        $group: {
          _id: null,
          count: { $sum: 1 },
          totalAmount: { $sum: "$amount" },
        },
      },
    ]);

    // Extract results from aggregations
    const dailyResult = dailyAggregation[0] || { count: 0, totalAmount: 0 };
    const weeklyResult = weeklyAggregation[0] || { count: 0, totalAmount: 0 };
    const monthlyResult = monthlyAggregation[0] || { count: 0, totalAmount: 0 };

    // Response
    res.status(200).json({
      total: totalTransactions,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(totalTransactions / limit),
      transactions,
      summary: {
        daily: {
          count: dailyResult.count,
          totalAmount: dailyResult.totalAmount,
        },
        weekly: {
          count: weeklyResult.count,
          totalAmount: weeklyResult.totalAmount,
        },
        monthly: {
          count: monthlyResult.count,
          totalAmount: monthlyResult.totalAmount,
        },
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  createTransaction,
  getTransactionsByUser,
};
