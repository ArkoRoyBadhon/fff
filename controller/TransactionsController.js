const mongoose = require("mongoose");
const Transaction = require("../models/Transactions");
const Order = require("../models/Order");

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
      commision,
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
      commision: commision,
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
const getTransactionsBySeller = async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    if (!userId) {
      return res.status(400).json({ error: "User ID is required" });
    }

    const skip = (page - 1) * limit;

    const ordersBySeller = await Order.find({ seller: userId })
      .select(
        "_id paymentTerms status total upfrontAmount postDeliveryAmount deliverTime createdAt"
      )
      .lean();

    const orderIds = ordersBySeller.map((order) => order._id);

    const transactions = await Transaction.find({ order: { $in: orderIds } })
      .populate({
        path: "order",
        populate: [
          {
            path: "product",
          },
          {
            path: "seller",
            select: "name email",
          },
        ],
      })
      .sort({ createdAt: -1 })
      .skip(parseInt(skip))
      .limit(parseInt(limit));

    const upcomingPayments = [];

    ordersBySeller.forEach((order) => {
      const orderTotal = order.total || 0;

      if (
        order.paymentTerms?.onDelivery &&
        order.status !== "Delivered" &&
        order.status !== "Completed"
      ) {
        const onDeliveryAmount =
          (orderTotal * order.paymentTerms.onDelivery) / 100;
        upcomingPayments.push({
          order: order._id,
          type: "onDelivery",
          amount: onDeliveryAmount,
          dueDate: order.deliverTime || null,
          status: "Pending",
          // percentage: milestone.percentage,
          // days: milestone.days,
          createdAt: order.createdAt,
        });
      }

      if (
        order.paymentTerms?.milestones &&
        order.paymentTerms.milestones.length > 0
      ) {
        order.paymentTerms.milestones.forEach((milestone) => {
          const milestoneAmount = (orderTotal * milestone.percentage) / 100;
          const dueDate = new Date(order.createdAt);
          dueDate.setDate(dueDate.getDate() + milestone.days);

          upcomingPayments.push({
            order: order,
            type: "milestone",
            amount: milestoneAmount,
            dueDate: dueDate,
            status: "Pending",
            percentage: milestone.percentage,
            days: milestone.days,
            createdAt: order.createdAt,
          });
        });
      }
    });

    const filteredUpcoming = upcomingPayments.filter((upcoming) => {
      return !transactions.some(
        (tx) =>
          tx.order._id.equals(upcoming.order) && tx.amount === upcoming.amount
      );
    });

    // Total counts
    const totalTransactions = await Transaction.countDocuments({
      order: { $in: orderIds },
    });
    const totalUpcoming = filteredUpcoming.length;

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
          order: { $in: orderIds },
          createdAt: { $gte: startOfDay },
          // status: "Completed",
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
          order: { $in: orderIds },
          createdAt: { $gte: startOfWeek },
          // status: "Completed",
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
          order: { $in: orderIds },
          createdAt: { $gte: startOfMonth },
          // status: "Completed",
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

    // Calculate upcoming amounts
    const upcomingDailyAmount = filteredUpcoming
      .filter((up) => up.dueDate >= startOfDay)
      .reduce((sum, up) => sum + up.amount, 0);

    const upcomingWeeklyAmount = filteredUpcoming
      .filter((up) => up.dueDate >= startOfWeek)
      .reduce((sum, up) => sum + up.amount, 0);

    const upcomingMonthlyAmount = filteredUpcoming
      .filter((up) => up.dueDate >= startOfMonth)
      .reduce((sum, up) => sum + up.amount, 0);

    // Response
    res.status(200).json({
      total: totalTransactions,
      upcomingTotal: totalUpcoming,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(totalTransactions / limit),
      transactions,
      upcoming: filteredUpcoming,
      summary: {
        daily: {
          count: dailyResult.count,
          totalAmount: dailyResult.totalAmount,
          upcomingAmount: upcomingDailyAmount,
        },
        weekly: {
          count: weeklyResult.count,
          totalAmount: weeklyResult.totalAmount,
          upcomingAmount: upcomingWeeklyAmount,
        },
        monthly: {
          count: monthlyResult.count,
          totalAmount: monthlyResult.totalAmount,
          upcomingAmount: upcomingMonthlyAmount,
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
  getTransactionsBySeller,
};
