const cron = require("node-cron");
const Subscription = require("../models/Subscription");
const User = require("../models/User");
const Catalog = require("../models/Catalog");

// Function to check and expire subscriptions
const checkAndExpireSubscriptions = async () => {
  try {
    const now = new Date();
    console.log(`Running subscription expiration check at ${now}`);

    // Find active subscriptions that have expired
    const expiredSubscriptions = await Subscription.find({
      status: "active",
      endDate: { $lte: now },
    });

    if (expiredSubscriptions.length === 0) {
      console.log("No subscriptions to expire");
      return;
    }

    // Update subscriptions and corresponding users
    for (const subscription of expiredSubscriptions) {
      try {
        // Update the subscription to expired
        await Subscription.updateOne(
          { _id: subscription._id },
          {
            $set: {
              status: "expired",
              updatedAt: now,
            },
          }
        );

        // Update the corresponding user
        const userUpdateResult = await User.updateOne(
          { _id: subscription.userId },
          {
            $set: {
              subscriptionStatus: "expired",
              currentPackage: null,
              "packageConditions.current.isArchived": true,
            },
          }
        );

        // Archive excess catalogs if basic plan has a limit
        const user = await User.findById(subscription.userId);
        const conditions = user.packageConditions.basic;

        if (conditions.maxCatalogs !== 0) { // Skip if basic plan allows unlimited catalogs
          const catalogCount = await Catalog.countDocuments({
            sellerId: user._id,
            isArchived: false,
          });

          if (catalogCount > conditions.maxCatalogs) {
            const catalogsToArchive = await Catalog.find({
              sellerId: user._id,
              isArchived: false,
            })
              .sort({ createdAt: 1 }) // Oldest first
              .limit(catalogCount - conditions.maxCatalogs);

            for (const catalog of catalogsToArchive) {
              await Catalog.updateOne(
                { _id: catalog._id },
                { $set: { isArchived: true } }
              );
              console.log(`Archived catalog ${catalog._id} for user ${user._id}`);
            }
          }
        }

        if (userUpdateResult.matchedCount === 0) {
          console.warn(
            `User with ID ${subscription.userId} not found for subscription ${subscription._id}`
          );
        } else if (userUpdateResult.matchedCount > 0) {
          console.log(`Updated user ${subscription.userId} to expired status`);
        }
      } catch (error) {
        console.error(
          `Error processing subscription ${subscription._id}:`,
          error.message
        );
      }
    }

    console.log(`Expired ${expiredSubscriptions.length} subscriptions`);
  } catch (error) {
    console.error("Error in subscription expiration check:", error);
  }
};

// Initialize the cron job
const initSubscriptionCron = async () => {
  // Run every minute to check for subscriptions nearing expiration
  cron.schedule("* * * * *", async () => {
    try {
      const now = new Date();
      const nextMinute = new Date(now.getTime() + 60 * 1000);

      // Find active subscriptions expiring within the next minute
      const subscriptionsToCheck = await Subscription.find({
        status: "active",
        endDate: { $gte: now, $lte: nextMinute },
      }).populate("packageId");

      if (subscriptionsToCheck.length === 0) {
        console.log("No subscriptions to check in the next minute");
        return;
      }

      // Schedule a task for each subscription's exact endDate
      for (const subscription of subscriptionsToCheck) {
        const timeUntilExpiration = subscription.endDate - now;
        if (timeUntilExpiration > 0) {
          setTimeout(() => {
            checkAndExpireSubscriptions();
          }, timeUntilExpiration);
          console.log(
            `Scheduled expiration check for subscription ${subscription._id} at ${subscription.endDate}`
          );
        } else {
          // If already expired, run immediately
          checkAndExpireSubscriptions();
        }
      }
    } catch (error) {
      console.error("Error scheduling subscription checks:", error);
    }
  });

  console.log("Subscription expiration cron job initialized");
};

module.exports = initSubscriptionCron;