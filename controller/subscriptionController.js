const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const Package = require("../models/Package");
const Subscription = require("../models/Subscription");
const User = require("../models/User");
const asyncHandler = require("express-async-handler");

// Create Stripe Payment Intent
const createPaymentIntent = asyncHandler(async (req, res) => {
  const { packageId, amount } = req.body;
  const userId = req.user._id;

  console.log("Creating payment intent:", { packageId, amount, userId });

  if (!packageId || !amount || amount <= 0) {
    console.error("Invalid input:", { packageId, amount });
    res.status(400);
    throw new Error("Invalid packageId or amount");
  }

  // Check for existing active subscription
  const activeSubscription = await Subscription.findOne({
    userId,
    status: "active",
    endDate: { $gt: new Date() },
  });

  if (activeSubscription) {
    console.error("Active subscription exists for userId:", userId);
    res.status(400);
    throw new Error(
      "You already have an active subscription. Please wait until it expires to purchase a new plan."
    );
  }

  const package = await Package.findById(packageId);
  if (!package) {
    console.error("Package not found for ID:", packageId);
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
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: package.currency || "usd",
      payment_method_types: ["card"],
      customer: stripeCustomerId,
      setup_future_usage: "off_session", // Indicates intent to save the card for future use
      metadata: { userId: userId.toString(), packageId: packageId.toString() },
    });

    console.log("Payment intent created:", paymentIntent.id);
    res.json({ clientSecret: paymentIntent.client_secret });
  } catch (stripeError) {
    console.error("Stripe error:", {
      message: stripeError.message,
      code: stripeError.code,
      type: stripeError.type,
    });
    res.status(500);
    throw new Error(stripeError.message || "Failed to create payment intent");
  }
});

// Handle successful payment
const handlePaymentSuccess = asyncHandler(async (req, res) => {
  const { sessionId } = req.body;
  console.log("Handling payment success for sessionId:", sessionId);

  try {
    const paymentIntent = await stripe.paymentIntents.retrieve(sessionId);

    if (paymentIntent.status === "succeeded") {
      const { userId, packageId } = paymentIntent.metadata;
      const package = await Package.findById(packageId);
      if (!package) {
        console.error("Package not found for ID:", packageId);
        res.status(404);
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
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      });
      await subscription.save();

      await User.findByIdAndUpdate(userId, {
        subscriptionId: subscription._id,
      });

      console.log("Subscription created:", subscription._id);
      res.json({ message: "Subscription created successfully", subscription });
    } else {
      console.error("Payment not succeeded:", paymentIntent.status);
      res.status(400);
      throw new Error("Payment not completed");
    }
  } catch (error) {
    console.error("Payment success error:", error.message);
    res.status(500);
    throw new Error(error.message || "Failed to process payment");
  }
});

// Assign Free package to new seller
const assignFreePackage = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  console.log("Assigning free package for userId:", userId);

  const freePackage = await Package.findOne({ name: "Free" });
  if (!freePackage) {
    console.error("Free package not found");
    res.status(400);
    throw new Error("Free package not found");
  }

  const existingSubscription = await Subscription.findOne({ userId });
  if (existingSubscription) {
    console.error("User already has subscription:", userId);
    res.status(400);
    throw new Error("User already has a subscription");
  }

  const subscription = new Subscription({
    userId,
    packageId: freePackage._id,
    status: "active",
    endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  });
  await subscription.save();

  await User.findByIdAndUpdate(userId, { subscriptionId: subscription._id });

  console.log("Free package assigned:", subscription._id);
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

  console.log("Subscriptions fetched:", { page, limit, total, subscriptions });

  res.json({
    subscriptions,
    total,
    page,
    pages: Math.ceil(total / limit),
  });
});

// Get active subscription for authenticated seller
const getActiveSubscription = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  console.log("Fetching active subscription for userId:", userId);

  const subscription = await Subscription.findOne({
    userId,
    status: "active",
    endDate: { $gt: new Date() },
  })
    .populate({
      path: "packageId",
      select: "name price features conditions discount",
    })
    .lean();

  if (!subscription) {
    console.log("No active subscription found for userId:", userId);
    return res.json({ subscription: null });
  }

  console.log("Active subscription found:", subscription._id);
  res.json({ subscription });
});

// Get user's saved payment methods
const getPaymentMethods = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  console.log("Fetching payment methods for userId:", userId);

  const user = await User.findById(userId).select("paymentMethods");
  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  res.json({ paymentMethods: user.paymentMethods });
});

module.exports = {
  createPaymentIntent,
  handlePaymentSuccess,
  assignFreePackage,
  getSubscriptions,
  getActiveSubscription,
  getPaymentMethods,
};