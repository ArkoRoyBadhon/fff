const Feature = require("../models/Feature");
const asyncHandler = require("express-async-handler");

// Get all features
const getFeatures = asyncHandler(async (req, res) => {
  const features = await Feature.find();
  if (!features || features.length === 0) {
    res.status(404);
    throw new Error("No features found");
  }
  res.json(features);
});

// Create or update feature
const manageFeature = asyncHandler(async (req, res) => {
  const { id, name } = req.body;
  if (!name) {
    res.status(400);
    throw new Error("Feature name is required");
  }
  if (id) {
    const feature = await Feature.findById(id);
    if (!feature) {
      res.status(404);
      throw new Error("Feature not found");
    }
    const existingFeature = await Feature.findOne({ name, _id: { $ne: id } });
    if (existingFeature) {
      res.status(400);
      throw new Error("Feature name must be unique");
    }
    feature.name = name;
    feature.updatedAt = Date.now();
    await feature.save();
    res.json({ message: "Feature updated", feature });
  } else {
    const existingFeature = await Feature.findOne({ name });
    if (existingFeature) {
      res.status(400);
      throw new Error("Feature name must be unique");
    }
    const newFeature = new Feature({ name });
    await newFeature.save();
    res
      .status(201)
      .json({ message: "Feature created", feature: newFeature, created: true });
  }
});

// Delete feature
const deleteFeature = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const feature = await Feature.findById(id);
  if (!feature) {
    res.status(404);
    throw new Error("Feature not found");
  }
  await feature.remove();
  res.json({ message: "Feature deleted" });
});

module.exports = { getFeatures, manageFeature, deleteFeature };
