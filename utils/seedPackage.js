const Package = require('../models/Package');

const seedPackages = async () => {
  try {
    // Check if packages already exist
    const existingPackages = await Package.countDocuments({ isActive: true });
    if (existingPackages > 0) {
      console.log('Packages already seeded. Skipping package seeding.');
      return;
    }

    // Define the three packages
    const packages = [
      {
        name: 'Free',
        price: 0,
        currency: 'usd',
        features: ['Basic product catalog', 'Standard support'],
        conditions: { maxCatalogs: 3, maxProductsPerCatalog: 2 },
        discount: 0,
        isActive: true,
      },
      {
        name: 'Standard',
        price: 10,
        currency: 'usd',
        features: ['Advanced catalog', 'Priority support'],
        conditions: { maxCatalogs: 10, maxProductsPerCatalog: 0 },
        discount: 0,
        isActive: true,
      },
      {
        name: 'Premium',
        price: 20,
        currency: 'usd',
        features: ['Unlimited catalogs', '24/7 support', 'Dedicated manager'],
        conditions: { maxCatalogs: 0, maxProductsPerCatalog: 0 },
        discount: 0,
        isActive: true,
      },
    ];

    // Insert packages into the database
    await Package.insertMany(packages);
    console.log('Three subscription packages seeded successfully!');
  } catch (error) {
    console.error('Error seeding packages:', error.message);
    throw error;
  }
};

module.exports = seedPackages;