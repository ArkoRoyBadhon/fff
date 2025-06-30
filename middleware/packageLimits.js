const User = require("../models/User");
const Catalog = require("../models/Catalog");

const checkCatalogLimit = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);

    // Get appropriate conditions based on subscription status
    const conditions =
      user.subscriptionStatus === "active" &&
      user.packageConditions.current &&
      !user.packageConditions.current.isArchived
        ? user.packageConditions.current.conditions
        : user.packageConditions.basic;

    // Skip limit check if maxCatalogs is 0 (unlimited)
    if (conditions.maxCatalogs !== 0) {
      const catalogCount = await Catalog.countDocuments({
        sellerId: user._id,
        isArchived: false,
      });

      if (catalogCount >= conditions.maxCatalogs) {
        return res.status(403).json({
          error:
            `You've reached your catalog limit (${conditions.maxCatalogs}). ` +
            `${
              user.subscriptionStatus === "active"
                ? "Upgrade your plan for more."
                : "Subscribe to a plan for more."
            }`,
        });
      }
    }

    next();
  } catch (error) {
    console.error("Error checking catalog limit:", error);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = { checkCatalogLimit };