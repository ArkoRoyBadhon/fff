// utils/packageUtils.js
const User = require('../models/User');
const Package = require('../models/Package');

const updateAllSellersBasicConditions = async () => {
  try {
    const freePackage = await Package.findOne({ type: 'free', isActive: true });
    if (!freePackage) {
      console.warn('No active free package found');
      return;
    }

    await User.updateMany(
      { role: 'seller' },
      { 
        $set: { 
          'basicConditions.maxCatalogs': freePackage.conditions.maxCatalogs,
          'basicConditions.maxProductsPerCatalog': freePackage.conditions.maxProductsPerCatalog
        } 
      }
    );

    console.log('Updated basicConditions for all sellers');
  } catch (err) {
    console.error('Error updating sellers basic conditions:', err);
  }
};

module.exports = { updateAllSellersBasicConditions };