const Package = require("../models/Package");
const asyncHandler = require("express-async-handler");

// Get all packages
const getPackages = asyncHandler(async (req, res) => {
  const packages = await Package.find({ isActive: true });
  if (!packages || packages.length === 0) {
    res.status(404);
    throw new Error("No active packages found");
  }
  res.json(packages);
});

// Create package
const createPackage = asyncHandler(async (req, res) => {
  const { name, price, features, conditions, discount } = req.body;
  if (!name || price == null || !Array.isArray(features) || !conditions) {
    res.status(400);
    throw new Error("Missing required fields");
  }
  if (price < 0 || discount < 0 || discount > 100) {
    res.status(400);
    throw new Error("Invalid price or discount");
  }
  if (conditions.maxCatalogs < 0 || conditions.maxProductsPerCatalog < 0) {
    res.status(400);
    throw new Error("Invalid conditions");
  }
  const existingPackage = await Package.findOne({ name });
  if (existingPackage) {
    res.status(400);
    throw new Error("Invalid name: Package name must be unique");
  }
  const newPackage = new Package({
    name,
    price,
    features,
    conditions,
    discount,
  });
  await newPackage.save();
  res
    .status(201)
    .json({ message: "Package created", package: newPackage, created: true });
});

// Update package
const updatePackage = asyncHandler(async (req, res) => {
  const { id, name, price, features, conditions, discount } = req.body;
  if (
    !id ||
    !name ||
    price < 0 ||
    !Array.isArray(features) ||
    !conditions ||
    discount < 0 ||
    discount > 100
  ) {
    res.status(400);
    throw new Error("Invalid input data");
  }
  const package = await Package.findById(id);
  if (!package) {
    res.status(404);
    throw new Error("Package not found");
  }
  const existingPackage = await Package.findOne({ name, _id: { $ne: id } });
  if (existingPackage) {
    res.status(400);
    throw new Error("Invalid name: Package name must be unique");
  }
  package.name = name;
  package.price = price;
  package.features = features;
  package.conditions = conditions;
  package.discount = discount;
  package.updatedAt = Date.now();
  await package.save();
  res.json({ message: "Package updated", package });
});

// Delete package
const deletePackage = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const package = await Package.findById(id);
  if (!package) {
    res.status(404);
    throw new Error("Package not found");
  }
  package.isActive = false; 
  await package.save();
  res.json({ message: "Package deleted" });
});

module.exports = { getPackages, createPackage, updatePackage, deletePackage };
