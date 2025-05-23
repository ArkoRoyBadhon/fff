const Subscription = require("../models/Subscription");
const User = require("../models/User");
const Admin = require("../models/Admin");
const Notification = require("../models/Notification");

// Helper function to create a notification (reusing the existing one)
const createNotification = async (userId, role, type, module, message, link, metadata = {}) => {
  try {
    const notification = new Notification({
      userId,
      role,
      type,
      module,
      message,
      link,
      metadata,
    });
    await notification.save();
    console.log(`Notification created for user ${userId} with role ${role}: ${message}`);
  } catch (error) {
    console.error(`Error creating notification for user ${userId}:`, error);
    throw error;
  }
};

// @desc    Request a subscription
// @route   POST /api/subscriptions/request
// @access  Private (Seller)
exports.requestSubscription = async (req, res) => {
  const { plan } = req.body;
  const userId = req.user._id;

  try {
    if (!["free", "premium"].includes(plan)) {
      return res.status(400).json({ message: "Invalid plan type" });
    }

    // Check if user already has a pending or approved subscription
    const existingSubscription = await Subscription.findOne({
      user: userId,
      status: { $in: ["pending", "approved"] },
    });

    if (existingSubscription) {
      return res.status(400).json({ message: "You already have an active or pending subscription" });
    }

    const subscription = await Subscription.create({
      user: userId,
      plan,
    });

    // Notify the seller
    const currentDateTime = new Date().toLocaleString("en-US", { timeZone: "Asia/Dhaka" }); // Current time in Bangladesh (+06)
    try {
      await createNotification(
        userId,
        "seller",
        "info",
        "subscription",
        `Your ${plan} subscription request submitted at ${currentDateTime} is pending approval.`,
        "/seller/subscription-status",
        { subscriptionId: subscription._id }
      );
    } catch (notificationError) {
      console.error("Seller notification error:", notificationError.message);
      // Continue even if notification fails
    }

    // Notify admins
    try {
      const admins = await Admin.find();
      for (const admin of admins) {
        await createNotification(
          admin._id,
          "admin",
          "info",
          "subscription",
          `New ${plan} subscription request submitted at ${currentDateTime} by seller (ID: ${userId}).`,
          "/admin/subscriptions",
          { subscriptionId: subscription._id }
        );
      }
    } catch (notificationError) {
      console.error("Admin notification error:", notificationError.message);
      // Continue even if notification fails
    }

    res.status(201).json({
      success: true,
      message: "Subscription request submitted successfully",
      subscription,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

// @desc    Get all subscription requests
// @route   GET /api/subscriptions
// @access  Private (Admin)
exports.getSubscriptionRequests = async (req, res) => {
  try {
    const subscriptions = await Subscription.find()
      .populate("user", "firstName lastName email companyName")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      subscriptions,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

// @desc    Approve or reject a subscription
// @route   PUT /api/subscriptions/:id
// @access  Private (Admin)
exports.manageSubscription = async (req, res) => {
  const { status } = req.body;
  const subscriptionId = req.params.id;

  try {
    if (!["approved", "rejected"].includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const subscription = await Subscription.findById(subscriptionId);
    if (!subscription) {
      return res.status(404).json({ message: "Subscription not found" });
    }

    subscription.status = status;
    await subscription.save();

    const currentDateTime = new Date().toLocaleString("en-US", { timeZone: "Asia/Dhaka" }); // Current time in Bangladesh (+06)

    if (status === "approved") {
      const user = await User.findById(subscription.user);
      user.membership = subscription.plan;
      user.isActive = true;
      await user.save();

      // Notify the seller about approval
      try {
        await createNotification(
          subscription.user,
          "seller",
          "success",
          "subscription",
          `Your ${subscription.plan} subscription was approved at ${currentDateTime}.`,
          "/seller/subscription-status",
          { subscriptionId: subscription._id }
        );
      } catch (notificationError) {
        console.error("Seller notification error:", notificationError.message);
        // Continue even if notification fails
      }
    } else if (status === "rejected") {
      // Notify the seller about rejection
      try {
        await createNotification(
          subscription.user,
          "seller",
          "error",
          "subscription",
          `Your ${subscription.plan} subscription request was rejected at ${currentDateTime}.`,
          "/seller/subscription-status",
          { subscriptionId: subscription._id }
        );
      } catch (notificationError) {
        console.error("Seller notification error:", notificationError.message);
        // Continue even if notification fails
      }
    }

    res.json({
      success: true,
      message: `Subscription ${status} successfully`,
      subscription,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};