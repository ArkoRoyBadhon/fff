const mongoose = require("mongoose");
const Advertisement = require("../models/Advertisement");
const UserActivity = require("../models/UserActivity");
const requestIp = require("request-ip");
const createNotificationFunc = require("../utils/createNotification");

const createAdvertisement = async (req, res) => {
  try {
    const {
      title,
      description,
      targetKeywords,
      categories,
      duration,
      adType,
      media,
      budget,
      product,
      targetCountries,
    } = req.body;

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
      media,
      budget,
      product,
      targetCountries,
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
      media,
      product,
      budget,
      spent,
      targetCountries,
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
    advertisement.product = product || advertisement.product;
    advertisement.budget = Number(budget) || advertisement.budget;
    // spent
    advertisement.spent = advertisement.spent + (spent || 0);
    advertisement.targetCountries =
      targetCountries || advertisement.targetCountries;

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
      media,
    } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid advertisement ID" });
    }

    const advertisement = await Advertisement.findById(id).populate("product");

    if (!advertisement) {
      return res.status(404).json({ message: "Advertisement not found" });
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
    advertisement.targetCountries = advertisement.targetCountries;

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

    await createNotificationFunc(
      advertisement?.product?.seller,
      "seller",
      "info",
      "advertisement",
      `Advertisement (${advertisement?.title}) set ${status} by Admin`,
      `/seller/campaigns/${updatedAdvertisement?._id}`,
      { modification: updatedAdvertisement?._id }
    );

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

    const advertisement = await Advertisement.findById(id).populate("product");
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

    // await Advertisement.findByIdAndDelete(id);

    await createNotificationFunc(
      advertisement?.product?.seller,
      "seller",
      "info",
      "advertisement",
      `Advertisement (${advertisement?.title}) deleted`,
      "#",
      { modification: advertisement?._id }
    );
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
    const { status = "Active", type } = req.query;

    const ipAddress = requestIp.getClientIp(req);
    const userCountry = req.headers["x-country"] || "default-country";

    const userActivity = await UserActivity.findOne({ ipAddress });

    const baseQuery = { status };

    const personalizedConditions = [];

    if (userActivity) {
      const categoryIds = userActivity.categoryClicks.map((click) =>
        click.categoryName.toString()
      );
      const searchKeywords = userActivity.searches.map((search) =>
        search.searchString.toLowerCase()
      );

      if (categoryIds.length > 0) {
        personalizedConditions.push({ categories: { $in: categoryIds } });
      }
      if (searchKeywords.length > 0) {
        personalizedConditions.push({
          targetKeywords: { $in: searchKeywords },
        });
      }
    }

    personalizedConditions.push({ targetCountries: { $in: [userCountry] } });

    const query =
      personalizedConditions.length > 0
        ? {
            ...baseQuery,
            $or: personalizedConditions,
          }
        : baseQuery;

    await Advertisement.updateMany(
      {
        status: "Active",
        approveDate: { $ne: null },
        $expr: {
          $gt: [
            new Date(),
            {
              $add: [
                "$approveDate",
                { $multiply: ["$duration", 24 * 60 * 60 * 1000] },
              ],
            },
          ],
        },
      },
      { $set: { status: "Paused" } }
    );

    // Try to fetch personalized ads first
    let advertisements = await Advertisement.find(query)
      .sort({ createdAt: -1 })
      .limit(4)
      .populate("createdBy", "name email")
      .populate("categories", "name")
      .populate("product");

    // If no personalized ads found, get random active ads
    if (advertisements.length === 0) {
      advertisements = await Advertisement.aggregate([
        { $match: { status: "Active" } },
        { $sample: { size: 4 } },
        {
          $lookup: {
            from: "users",
            localField: "createdBy",
            foreignField: "_id",
            as: "createdBy",
            pipeline: [{ $project: { name: 1, email: 1 } }],
          },
        },
        { $unwind: "$createdBy" },
        {
          $lookup: {
            from: "categories",
            localField: "categories",
            foreignField: "_id",
            as: "categories",
            pipeline: [{ $project: { name: 1 } }],
          },
        },
        {
          $lookup: {
            from: "products",
            localField: "product",
            foreignField: "_id",
            as: "product",
          },
        },
        { $unwind: "$product" },
      ]);
    }

    // Record impressions for each advertisement
    const impressionPromises = advertisements.map(async (ad) => {
      try {
        const adDoc = ad._id ? await Advertisement.findById(ad._id) : ad;
        await adDoc.recordImpression();
        return adDoc;
      } catch (err) {
        console.error("Error recording impression:", err);
        return ad;
      }
    });

    // Wait for all impressions to be recorded
    const adsWithImpressions = await Promise.all(impressionPromises);

    res.json(adsWithImpressions);
  } catch (error) {
    console.error("Error fetching advertisements:", error);
    res.status(500).json({
      message: "Server error while fetching advertisements",
      error: error.message,
    });
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
      .populate("categories", "name")
      .populate("product");

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
      .populate("categories", "name")
      .populate({
        path: "product",
        populate: { path: "seller", model: "User" },
      });

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
      .populate("categories", "name")
      .populate({
        path: "product",
        populate: { path: "seller", model: "User" },
      });

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

const getActiveAdvertisementsStats = async (req, res) => {
  const id = req.user?._id;
  try {
    const activeAds = await Advertisement.find({
      status: "Active",
      createdBy: id,
    });

    const activeCount = activeAds.length;
    const totalSpent = activeAds.reduce((acc, ad) => acc + ad.spent, 0);

    // Respond with the results
    res.status(200).json({
      activeCount,
      totalSpent,
    });
  } catch (error) {
    console.error("Error fetching active advertisements stats:", error);
    res.status(500).json({ message: "Internal server error" });
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
  getActiveAdvertisementsStats,
};
