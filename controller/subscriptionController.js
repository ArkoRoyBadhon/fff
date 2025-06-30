const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const Package = require("../models/Package");
const Subscription = require("../models/Subscription");
const User = require("../models/User");
const Catalog = require("../models/Catalog");
const asyncHandler = require("express-async-handler");

// Constants for grace period (in milliseconds)
const GRACE_PERIOD = 5 * 1000; // 5 seconds

// Utility function to calculate endDate based on package duration
const calculateEndDate = (startDate, duration) => {
  const { value, unit } = duration;
  const endDate = new Date(startDate);

  switch (unit) {
    case "minutes":
      endDate.setMinutes(endDate.getMinutes() + value);
      break;
    case "months":
      endDate.setMonth(endDate.getMonth() + value);
      break;
    case "years":
      endDate.setFullYear(endDate.getFullYear() + value);
      break;
    default:
      throw new Error("Invalid duration unit");
  }

  return endDate;
};

// Create Stripe Payment Intent
const createPaymentIntent = asyncHandler(async (req, res) => {
  const { packageId, amount, isRenewal } = req.body;
  const userId = req.user._id;

  if (!packageId || !amount || amount <= 0) {
    res.status(400);
    throw new Error("Invalid packageId or amount");
  }

  const package = await Package.findById(packageId);
  if (!package) {
    res.status(404);
    throw new Error("Package not found");
  }

  // Fetch or create Stripe customer
  let user = await User.findById(userId);
  let stripeCustomerId = user.stripeCustomerId;

  if (!stripeCustomerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      name: `${user.firstName} ${user.lastName}`,
      metadata: { userId: userId.toString() },
    });
    stripeCustomerId = customer.id;
    user.stripeCustomerId = stripeCustomerId;
    await user.save();
  }

  try {
    const existingSubscription = await Subscription.findOne({ userId });

    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: package.currency || "usd",
      payment_method_types: ["card"],
      customer: stripeCustomerId,
      setup_future_usage: "off_session",
      metadata: {
        userId: userId.toString(),
        packageId: packageId.toString(),
        isRenewal: isRenewal ? "true" : "false",
        existingSubscriptionId: existingSubscription
          ? existingSubscription._id.toString()
          : "",
      },
    });

    res.json({
      clientSecret: paymentIntent.client_secret,
      existingSubscriptionId: existingSubscription
        ? existingSubscription._id.toString()
        : null,
    });
  } catch (stripeError) {
    res.status(500);
    throw new Error(stripeError.message || "Failed to create payment intent");
  }
});

// Renew Subscription
const renewSubscription = asyncHandler(async (req, res) => {
  const { packageId } = req.body;
  const userId = req.user._id;

  if (!packageId) {
    res.status(400);
    throw new Error("Package ID is required");
  }

  const package = await Package.findById(packageId);
  if (!package) {
    res.status(404);
    throw new Error("Package not found");
  }

  const existingSubscription = await Subscription.findOne({ userId });
  if (!existingSubscription) {
    res.status(404);
    throw new Error("No existing subscription found");
  }

  // Calculate amount considering discount
  const amount = Math.round(
    (package.discount > 0
      ? package.price * (1 - package.discount / 100)
      : package.price) * 100
  );

  // Fetch user for Stripe customer ID
  const user = await User.findById(userId);
  if (!user.stripeCustomerId) {
    res.status(400);
    throw new Error("User has no associated Stripe customer ID");
  }

  // Create payment intent for renewal
  const paymentIntent = await stripe.paymentIntents.create({
    amount,
    currency: package.currency || "usd",
    payment_method_types: ["card"],
    customer: user.stripeCustomerId,
    setup_future_usage: "off_session",
    metadata: {
      userId: userId.toString(),
      packageId: packageId.toString(),
      isRenewal: "true",
      existingSubscriptionId: existingSubscription._id.toString(),
    },
  });

  res.json({
    clientSecret: paymentIntent.client_secret,
    existingSubscriptionId: existingSubscription._id.toString(),
  });
});

// Handle successful payment
const handlePaymentSuccess = asyncHandler(async (req, res) => {
  const { sessionId } = req.body;

  try {
    const paymentIntent = await stripe.paymentIntents.retrieve(sessionId);

    if (paymentIntent.status === "succeeded") {
      const { userId, packageId, isRenewal, existingSubscriptionId } =
        paymentIntent.metadata;
      const package = await Package.findById(packageId);
      if (!package) {
        throw new Error("Package not found");
      }

      // Save payment method
      const paymentMethod = await stripe.paymentMethods.retrieve(
        paymentIntent.payment_method
      );
      const user = await User.findById(userId);

      // Check if payment method already exists
      const existingMethod = user.paymentMethods.find(
        (pm) => pm.paymentMethodId === paymentMethod.id
      );
      if (!existingMethod) {
        user.paymentMethods.push({
          paymentMethodId: paymentMethod.id,
          last4: paymentMethod.card.last4,
          brand: paymentMethod.card.brand,
          expMonth: paymentMethod.card.exp_month,
          expYear: paymentMethod.card.exp_year,
        });
        await user.save();
      }

      // Attach payment method to customer
      await stripe.paymentMethods.attach(paymentMethod.id, {
        customer: user.stripeCustomerId,
      });

      const now = new Date();
      let startDate, endDate, gracePeriodEnd;

      // Calculate subscription dates
      startDate = now;
      endDate = calculateEndDate(startDate, package.duration);
      gracePeriodEnd = new Date(endDate.getTime() + GRACE_PERIOD);

      // Prepare user update object
      const userUpdate = {
        $set: {
          "packageConditions.current": {
            name: package.name,
            conditions: package.conditions,
            isArchived: false,
          },
          currentPackage: package._id,
          subscriptionStatus: "active",
        },
      };

      // Unarchive catalogs if necessary
      const maxCatalogs = package.conditions.maxCatalogs;
      if (maxCatalogs !== 0) { // Skip if unlimited catalogs
        const activeCatalogCount = await Catalog.countDocuments({
          sellerId: userId,
          isArchived: false,
        });

        if (activeCatalogCount < maxCatalogs) {
          const catalogsToUnarchive = await Catalog.find({
            sellerId: userId,
            isArchived: true,
          })
            .sort({ updatedAt: -1 }) // Most recently archived first
            .limit(maxCatalogs - activeCatalogCount);

          for (const catalog of catalogsToUnarchive) {
            await Catalog.updateOne(
              { _id: catalog._id },
              { $set: { isArchived: false } }
            );
            console.log(`Unarchived catalog ${catalog._id} for user ${userId}`);
          }
        }
      } else {
        // Unarchive all catalogs if maxCatalogs is 0 (unlimited)
        await Catalog.updateMany(
          { sellerId: userId, isArchived: true },
          { $set: { isArchived: false } }
        );
        console.log(`Unarchived all catalogs for user ${userId}`);
      }

      if (isRenewal === "true" && existingSubscriptionId) {
        const subscription = await Subscription.findById(existingSubscriptionId);

        if (!subscription) {
          throw new Error("Original subscription not found for renewal");
        }

        // Update subscription
        subscription.status = "active";
        subscription.packageId = packageId;
        subscription.startDate = startDate;
        subscription.endDate = endDate;
        subscription.gracePeriodEnd = gracePeriodEnd;
        subscription.transactionId = paymentIntent.id;
        subscription.paymentDetails = {
          amount: paymentIntent.amount / 100,
          currency: paymentIntent.currency,
          stripeSessionId: sessionId,
          paymentStatus: paymentIntent.status,
        };
        subscription.renewals.push({
          amount: paymentIntent.amount / 100,
          transactionId: paymentIntent.id,
          paymentDetails: {
            amount: paymentIntent.amount / 100,
            currency: paymentIntent.currency,
            stripeSessionId: sessionId,
            paymentStatus: paymentIntent.status,
          },
        });
        subscription.updatedAt = new Date();

        await subscription.save();

        // Update user
        await User.findByIdAndUpdate(userId, userUpdate, { new: true });

        return res.json({
          message: "Subscription renewed successfully",
          subscription,
        });
      }

      // Handle new subscription or update existing
      const existingSubscription = await Subscription.findOne({ userId });

      if (existingSubscription) {
        // Update existing subscription
        existingSubscription.packageId = packageId;
        existingSubscription.status = "active";
        existingSubscription.startDate = startDate;
        existingSubscription.endDate = endDate;
        existingSubscription.gracePeriodEnd = gracePeriodEnd;
        existingSubscription.transactionId = paymentIntent.id;
        existingSubscription.paymentDetails = {
          amount: paymentIntent.amount / 100,
          currency: paymentIntent.currency,
          stripeSessionId: sessionId,
          paymentStatus: paymentIntent.status,
        };
        existingSubscription.renewals.push({
          amount: paymentIntent.amount / 100,
          transactionId: paymentIntent.id,
          paymentDetails: {
            amount: paymentIntent.amount / 100,
            currency: paymentIntent.currency,
            stripeSessionId: sessionId,
            paymentStatus: paymentIntent.status,
          },
        });
        existingSubscription.updatedAt = new Date();

        await existingSubscription.save();

        // Update user
        await User.findByIdAndUpdate(
          userId,
          {
            $set: {
              subscriptionId: existingSubscription._id,
              ...userUpdate.$set,
            },
          },
          { new: true }
        );

        return res.json({
          message: "Subscription updated successfully",
          subscription: existingSubscription,
        });
      }

      // Create new subscription
      const subscription = new Subscription({
        userId,
        packageId,
        transactionId: paymentIntent.id,
        status: "active",
        paymentDetails: {
          amount: paymentIntent.amount / 100,
          currency: paymentIntent.currency,
          stripeSessionId: sessionId,
          paymentStatus: paymentIntent.status,
        },
        startDate,
        endDate,
        gracePeriodEnd,
      });
      await subscription.save();

      // Update user
      await User.findByIdAndUpdate(
        userId,
        {
          $set: {
            subscriptionId: subscription._id,
            ...userUpdate.$set,
          },
        },
        { new: true }
      );

      res.json({ message: "Subscription created successfully", subscription });
    } else {
      res.status(400);
      throw new Error("Payment not completed");
    }
  } catch (error) {
    res.status(500);
    throw new Error(error.message || "Failed to process payment");
  }
});

// Cancel subscription
const cancelSubscription = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const subscription = await Subscription.findOne({
    userId,
    status: { $in: ["active"] },
  });

  if (!subscription) {
    res.status(404);
    throw new Error("No active subscription found");
  }

  // Update subscription status to "none"
  subscription.status = "none";
  subscription.endDate = null;
  subscription.gracePeriodEnd = null;
  subscription.updatedAt = Date.now();
  await subscription.save();

  // Update user subscription status
  await User.findByIdAndUpdate(userId, {
    subscriptionStatus: "none",
    currentPackage: null,
  });

  res.json({ message: "Subscription cancelled successfully" });
});

// Check and update expired subscriptions
const checkExpiredSubscriptions = asyncHandler(async (req, res) => {
  const now = new Date();
  const expiredSubs = await Subscription.find({
    status: "active",
    endDate: { $lte: now },
  });

  for (const sub of expiredSubs) {
    await User.findByIdAndUpdate(sub.userId, {
      $set: {
        "packageConditions.current.isArchived": true,
        subscriptionStatus: "expired",
        currentPackage: null,
      },
    });
  }

  res.json({ message: "Expired subscriptions processed" });
});

// Assign Free package to new seller
const assignFreePackage = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const freePackage = await Package.findOne({ name: "Free" });
  if (!freePackage) {
    res.status(400);
    throw new Error("Free package not found");
  }

  const existingSubscription = await Subscription.findOne({ userId });
  if (existingSubscription) {
    res.status(400);
    throw new Error("User already has a subscription");
  }

  const startDate = new Date();
  const endDate = calculateEndDate(startDate, freePackage.duration);
  const gracePeriodEnd = new Date(endDate.getTime() + GRACE_PERIOD);

  const subscription = new Subscription({
    userId,
    packageId: freePackage._id,
    status: "active",
    startDate,
    endDate,
    gracePeriodEnd,
  });
  await subscription.save();

  await User.findByIdAndUpdate(userId, {
    subscriptionId: subscription._id,
    subscriptionStatus: "active",
    currentPackage: freePackage._id,
  });

  res.json({ message: "Free package assigned", subscription });
});

// Get all subscriptions (Admin)
const getSubscriptions = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  const total = await Subscription.countDocuments();
  const subscriptions = await Subscription.find()
    .populate("userId", "firstName lastName email")
    .populate("packageId", "name price")
    .skip(skip)
    .limit(limit);

  res.json({
    subscriptions,
    total,
    page,
    pages: Math.ceil(total / limit),
  });
});

// Get active or expired subscription for authenticated seller
const getActiveSubscription = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const subscription = await Subscription.findOne({
    userId,
    status: { $in: ["active", "expired"] },
  })
    .populate({
      path: "packageId",
      select: "name price features conditions discount",
    })
    .lean();

  res.json({ subscription });
});

// Get user's saved payment methods
const getPaymentMethods = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const user = await User.findById(userId).select("paymentMethods");
  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  res.json({ paymentMethods: user.paymentMethods });
});

module.exports = {
  createPaymentIntent,
  renewSubscription,
  handlePaymentSuccess,
  assignFreePackage,
  getActiveSubscription,
  cancelSubscription,
  checkExpiredSubscriptions,
  getSubscriptions,
  getPaymentMethods,
};