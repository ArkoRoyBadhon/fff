const asyncHandler = require('express-async-handler');
const Subscription = require('../models/Subscription');
const Package = require('../models/Package');
const Catalog = require('../models/Catalog'); 
const Product = require('../models/Product'); 

const enforceSubscriptionLimits = asyncHandler(async (req, res, next) => {
  const userId = req.user._id;
  const subscription = await Subscription.findOne({ userId }).populate('packageId');
  if (!subscription) {
    res.status(403);
    throw new Error('No active subscription found');
  }

  const { maxCatalogs, maxProductsPerCatalog } = subscription.packageId.conditions;

  if (req.path.includes('/catalogs')) {
    const catalogCount = await Catalog.countDocuments({ userId });
    if (maxCatalogs !== 0 && catalogCount >= maxCatalogs) {
      res.status(403);
      throw new Error(`Catalog limit of ${maxCatalogs} reached`);
    }
  }

  if (req.path.includes('/products')) {
    const { catalogId } = req.body;
    const productCount = await Product.countDocuments({ catalogId });
    if (maxProductsPerCatalog !== 0 && productCount >= maxProductsPerCatalog) {
      res.status(403);
      throw new Error(`Product limit of ${maxProductsPerCatalog} per catalog reached`);
    }
  }

  next();
});

module.exports = enforceSubscriptionLimits;