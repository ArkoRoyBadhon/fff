const mongoose = require("mongoose");
const Advertisement = require("../models/Advertisement");

const createAdvertisement = async (req, res) => {
  try {
    const { title, description, targetKeywords, categories, duration, adType, media } =
      req.body;

    if (
      !title ||
      !description ||
      !targetKeywords ||
      !categories ||
      !duration ||
      !adType
    ) {
      return res
        .status(400)
        .json({ message: "Please provide all required fields" });
    }

    const newAdvertisement = new Advertisement({
      title,
      description,
      targetKeywords: Array.isArray(targetKeywords)
        ? targetKeywords
        : targetKeywords.split(","),
      categories: Array.isArray(categories)
        ? categories
        : categories.split(","),
      duration: parseInt(duration),
      adType,
      createdBy: req.user.id,
      status: "Draft",
      media
    });

    const savedAdvertisement = await newAdvertisement.save();
    res.status(201).json(savedAdvertisement);
  } catch (error) {
    console.error("Error creating advertisement:", error);
    res
      .status(500)
      .json({ message: "Server error while creating advertisement" });
  }
};

const updateAdvertisement = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      description,
      targetKeywords,
      categories,
      duration,
      adType,
      status,
      media
    } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid advertisement ID" });
    }

    const advertisement = await Advertisement.findById(id);
    if (!advertisement) {
      return res.status(404).json({ message: "Advertisement not found" });
    }

    if (
      advertisement.createdBy.toString() !== req.user.id &&
      req.user.role !== "admin"
    ) {
      return res
        .status(403)
        .json({ message: "Not authorized to update this advertisement" });
    }

    // Update fields
    advertisement.title = title || advertisement.title;
    advertisement.description = description || advertisement.description;
    advertisement.targetKeywords = targetKeywords
      ? Array.isArray(targetKeywords)
        ? targetKeywords
        : targetKeywords.split(",")
      : advertisement.targetKeywords;
    advertisement.categories = categories
      ? Array.isArray(categories)
        ? categories
        : categories.split(",")
      : advertisement.categories;
    advertisement.duration = duration
      ? parseInt(duration)
      : advertisement.duration;
    advertisement.adType = adType || advertisement.adType;
    advertisement.status = status || advertisement.status;
    advertisement.media = media || advertisement.media;

    // If status is changing to active, set start and end dates
    if (status === "Active" && advertisement.status !== "Active") {
      advertisement.startDate = new Date();
      advertisement.endDate = new Date(
        new Date().setDate(
          advertisement.startDate.getDate() + advertisement.duration
        )
      );
    }

    const updatedAdvertisement = await advertisement.save();
    res.json(updatedAdvertisement);
  } catch (error) {
    console.error("Error updating advertisement:", error);
    res
      .status(500)
      .json({ message: "Server error while updating advertisement" });
  }
};
const updateAdvertisementAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      description,
      targetKeywords,
      categories,
      duration,
      adType,
      status,
      media
    } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid advertisement ID" });
    }

    const advertisement = await Advertisement.findById(id);
    if (!advertisement) {
      return res.status(404).json({ message: "Advertisement not found" });
    }

    if (
      advertisement.createdBy.toString() !== req.user.id &&
      req.user.role !== "admin"
    ) {
      return res
        .status(403)
        .json({ message: "Not authorized to update this advertisement" });
    }

    // Update fields
    advertisement.title = title || advertisement.title;
    advertisement.description = description || advertisement.description;
    advertisement.targetKeywords = targetKeywords
      ? Array.isArray(targetKeywords)
        ? targetKeywords
        : targetKeywords.split(",")
      : advertisement.targetKeywords;
    advertisement.categories = categories
      ? Array.isArray(categories)
        ? categories
        : categories.split(",")
      : advertisement.categories;
    advertisement.duration = duration
      ? parseInt(duration)
      : advertisement.duration;
    advertisement.adType = adType || advertisement.adType;
    advertisement.status = status || advertisement.status;
    advertisement.media = media || advertisement.media;

    // If status is changing to active, set start and end dates
    if (status === "Active" && advertisement.status !== "Active") {
      advertisement.startDate = new Date();
      advertisement.endDate = new Date(
        new Date().setDate(
          advertisement.startDate.getDate() + advertisement.duration
        )
      );
    }

    const updatedAdvertisement = await advertisement.save();
    res.json(updatedAdvertisement);
  } catch (error) {
    console.error("Error updating advertisement:", error);
    res
      .status(500)
      .json({ message: "Server error while updating advertisement" });
  }
};

const deleteAdvertisement = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid advertisement ID" });
    }

    const advertisement = await Advertisement.findById(id);
    if (!advertisement) {
      return res.status(404).json({ message: "Advertisement not found" });
    }

    if (
      advertisement.createdBy.toString() !== req.user.id &&
      req.user.role !== "admin"
    ) {
      return res
        .status(403)
        .json({ message: "Not authorized to delete this advertisement" });
    }

    await Advertisement.findByIdAndDelete(id);
    res.json({ message: "Advertisement deleted successfully" });
  } catch (error) {
    console.error("Error deleting advertisement:", error);
    res
      .status(500)
      .json({ message: "Server error while deleting advertisement" });
  }
};

const getAllAdvertisements = async (req, res) => {
  try {
    const { status } = req.query;
    const query = {};

    if (status) {
      query.status = status;
    }

    const advertisements = await Advertisement.find(query)
      .sort({ createdAt: -1 })
      .populate("createdBy", "name email")
      .populate("categories", "name");

    res.json(advertisements);
  } catch (error) {
    console.error("Error fetching advertisements:", error);
    res
      .status(500)
      .json({ message: "Server error while fetching advertisements" });
  }
};

const getAdvertisementsBySeller = async (req, res) => {
  try {
    const { status } = req.query;
    const query = { createdBy: req.user.id };

    if (status) {
      query.status = status;
    }

    const advertisements = await Advertisement.find(query)
      .sort({ createdAt: -1 })
      .populate("categories", "name");

    res.json(advertisements);
  } catch (error) {
    console.error("Error fetching seller advertisements:", error);
    res
      .status(500)
      .json({ message: "Server error while fetching seller advertisements" });
  }
};

const getAllAdvertisementsForAdmin = async (req, res) => {
  try {
    const { status } = req.query;
    const query = { status: { $ne: "Draft" } };

    if (status) {
      query.status = status;
    }

    const advertisements = await Advertisement.find(query)
      .sort({ createdAt: -1 })
      .populate("createdBy", "name email")
      .populate("categories", "name");

    res.json(advertisements);
  } catch (error) {
    console.error("Error fetching admin advertisements:", error);
    res
      .status(500)
      .json({ message: "Server error while fetching admin advertisements" });
  }
};

const getAdvertisement = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid advertisement ID" });
    }

    const advertisement = await Advertisement.findById(id)
      .populate("createdBy", "name email")
      .populate("categories", "name");

    if (!advertisement) {
      return res.status(404).json({ message: "Advertisement not found" });
    }

    res.json(advertisement);
  } catch (error) {
    console.error("Error fetching advertisement:", error);
    res
      .status(500)
      .json({ message: "Server error while fetching advertisement" });
  }
};

module.exports = {
  createAdvertisement,
  updateAdvertisement,
  updateAdvertisementAdmin,
  deleteAdvertisement,
  getAllAdvertisements,
  getAdvertisementsBySeller,
  getAllAdvertisementsForAdmin,
  getAdvertisement,
};
