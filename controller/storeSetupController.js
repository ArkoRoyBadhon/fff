const Store = require("../models/StoreSetup");
const Notification = require("../models/Notification");
const path = require("path");
const fs = require("fs");
const mongoose = require("mongoose");
const Admin = require("../models/Admin");
const Product = require("../models/Product");
const User = require("../models/User");
const StoreSetup = require("../models/StoreSetup");
const Catalog = require("../models/Catalog");
const Order = require("../models/Order");

// Helper function to create a notification
const createNotification = async (
  userId,
  role,
  type,
  module,
  message,
  link,
  metadata = {}
) => {
  try {
    const notification = new Notification({
      userId,
      role,
      type,
      module,
      message,
      link,
      metadata,
    });
    await notification.save();
    console.log(
      `Notification created for user ${userId} with role ${role}: ${message}`
    );
  } catch (error) {
    console.error(`Error creating notification for user ${userId}:`, error);
    throw error;
  }
};

// Create store
exports.createStore = async (req, res) => {
  try {
    const { storeData } = req.body;
    if (!storeData) {
      return res.status(400).json({ message: "Store data is required" });
    }

    const existingStore = await Store.findOne({ sellerId: req.user._id });
    if (existingStore) {
      return res
        .status(400)
        .json({ message: "Store setup already submitted. Awaiting approval." });
    }

    const parsedStoreData = JSON.parse(storeData);
    const files = req.files;

    const requiredFiles = [
      "storeLogo",
      "businessRegistration",
      "taxId",
      "proofOfAddress",
      "ownerIdentification",
    ];
    for (const field of requiredFiles) {
      if (!files[field] || !files[field][0]) {
        return res
          .status(400)
          .json({ message: `Missing required file: ${field}` });
      }
    }

    const store = {
      sellerId: req.user._id,
      ...parsedStoreData,
      storeLogo: files.storeLogo
        ? `/uploads/${files.storeLogo[0].filename}`
        : null,
      coverImage: files.coverImage
        ? `/uploads/${files.coverImage[0].filename}`
        : null,
      businessDetails: {
        ...parsedStoreData.businessDetails,
        businessRegistration: files.businessRegistration
          ? `/uploads/${files.businessRegistration[0].filename}`
          : null,
        taxId: files.taxId ? `/uploads/${files.taxId[0].filename}` : null,
        proofOfAddress: files.proofOfAddress
          ? `/uploads/${files.proofOfAddress[0].filename}`
          : null,
        ownerIdentification: files.ownerIdentification
          ? `/uploads/${files.ownerIdentification[0].filename}`
          : null,
        additionalDocuments: parsedStoreData.businessDetails.additionalDocuments
          .map((doc, index) =>
            files.additionalDocuments && files.additionalDocuments[index]
              ? {
                  name: doc.name,
                  file: `/uploads/${files.additionalDocuments[index].filename}`,
                }
              : null
          )
          .filter(Boolean),
      },
    };

    const newStore = new Store(store);
    await newStore.save();

    const admins = await Admin.find({});
    console.log(`Found ${admins.length} admins for notification`);
    for (const admin of admins) {
      await createNotification(
        admin._id,
        "admin",
        "info",
        "store",
        `New store setup submitted by seller: ${parsedStoreData.storeName}`,
        "/admin/manage-businesses",
        { storeId: newStore._id }
      );
    }

    await createNotification(
      req.user._id,
      "seller",
      "info",
      "store",
      `Your store setup for ${parsedStoreData.storeName} is pending approval.`,
      "/seller/company&site",
      { storeId: newStore._id }
    );

    res
      .status(201)
      .json({ message: "Store setup submitted successfully", store: newStore });
  } catch (error) {
    console.error("Error creating store:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Get store status
exports.getStoreStatus = async (req, res) => {
  try {
    const store = await Store.findOne({ sellerId: req.user._id }).select(
      "status rejectionReasons"
    );
    if (!store) {
      return res.status(404).json({ message: "No store setup found" });
    }
    res.status(200).json({
      status: store.status,
      rejectionReasons: store.rejectionReasons || [],
    });
  } catch (error) {
    console.error("Error fetching store status:", error);
    res.status(500).json({ message: "Server error" });
  }
};

exports.getStoreStatusAdmin = async (req, res) => {
  try {
    const sellerId = req.params.sellerId;
    const store = await Store.findOne({ sellerId: sellerId }).select(
      "status rejectionReasons"
    );
    if (!store) {
      return res.status(404).json({ message: "No store setup found" });
    }
    res.status(200).json({
      status: store.status,
      rejectionReasons: store.rejectionReasons || [],
    });
  } catch (error) {
    console.error("Error fetching store status:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Get store details
exports.getStoreDetails = async (req, res) => {
  try {
    const store = await Store.findOne({ sellerId: req.user._id });
    if (!store) {
      return res.status(404).json({ message: "No store setup found" });
    }
    // Define editable fields for approved stores
    const editableFields =
      store.status === "approved"
        ? [
            "storeName",
            "storeDescription",
            "storeLogo",
            "coverImage",
            "addressLine1",
            "addressLine2",
            "city",
            "postalCode",
            "country",
          ]
        : store.status === "rejected"
        ? store.rejectionReasons.map((r) => r.field)
        : [];
    res.status(200).json({ store, editableFields });
  } catch (error) {
    console.error("Error fetching store details:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Get all stores (for admin)
exports.getAllStores = async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    const query = {};
    if (status) {
      query.status = status;
    }

    const stores = await Store.find(query)
      .populate("sellerId")
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });

    const total = await Store.countDocuments(query);

    res.status(200).json({
      stores,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Error fetching all stores:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Get all stores (for user)
exports.getAllStoresForUser = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      searchTerm,
      rating,
      certificate,
      country,
      verified,
    } = req.query;

    // Base query for approved stores
    const query = { status: "approved" };

    // Apply filters
    if (searchTerm) {
      query.storeName = { $regex: searchTerm, $options: "i" };
    }

    if (rating) {
      query["rating.average"] = { $gte: parseFloat(rating) };
    }

    if (country) {
      query.country = country;
    }

    if (certificate) {
      query.certifications = { $regex: certificate, $options: "i" };
    }

    // Handle verified filter
    if (verified === "true") {
      const premiumUsers = await User.find({ membership: "premium" }).select(
        "_id"
      );
      const premiumUserIds = premiumUsers.map((user) => user._id);
      query.sellerId = { $in: premiumUserIds };
    }

    // Fetch stores with the complete query
    const stores = await Store.find(query)
      .populate("sellerId")
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });

    const storesWithProducts = await Promise.all(
      stores.map(async (store) => {
        const activeCatalogs = await Catalog.find({
          storeId: store._id,
          isArchived: false,
        }).select("_id");

        const catalogIds = activeCatalogs.map((catalog) => catalog._id);

        const products = await Product.find({
          seller: store.sellerId._id,
          catalog: { $in: catalogIds },
        })
          .limit(3)
          .sort({ createdAt: -1 });

        return {
          ...store.toObject(),
          products,
          sellerInfo: {
            membership: store.sellerId.membership || "free",
          },
        };
      })
    );

    // Get total count
    const total = await Store.countDocuments(query);

    res.status(200).json({
      stores: storesWithProducts,
      total,
      page: parseInt(page, 10),
      pages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Error fetching all stores:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Get store preview (for file preview)
exports.getFilePreview = async (req, res) => {
  try {
    const { filename } = req.params;
    const filePath = path.join(__dirname, "../public/uploads", filename);
    if (fs.existsSync(filePath)) {
      res.sendFile(filePath);
    } else {
      res.status(404).json({ message: "File not found" });
    }
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// Admin approve/reject store
exports.updateStoreStatus = async (req, res) => {
  try {
    const { storeId, status, rejectionReasons } = req.body;
    if (!["approved", "rejected", "pending"].includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const store = await Store.findById(storeId).populate("sellerId", "email");
    if (!store) {
      return res.status(404).json({ message: "Store not found" });
    }

    store.status = status;
    if (status === "rejected" && rejectionReasons) {
      store.rejectionReasons = rejectionReasons;
      await createNotification(
        store.sellerId._id,
        "seller",
        "error",
        "store",
        `Your store ${
          store.storeName
        } has been rejected. Reasons: ${rejectionReasons
          .map((r) => `${r.field}: ${r.reason}`)
          .join(", ")}.`,
        "/seller/store-details",
        { storeId, rejectionReasons }
      );
    } else if (status === "approved") {
      store.rejectionReasons = [];
      await createNotification(
        store.sellerId._id,
        "seller",
        "success",
        "store",
        `Your store ${store.storeName} has been approved.`,
        "/seller/store-details",
        { storeId }
      );
    } else if (status === "pending") {
      store.rejectionReasons = [];
      await createNotification(
        store.sellerId._id,
        "seller",
        "info",
        "store",
        `Your store ${store.storeName} is pending approval.`,
        "/seller/store-details",
        { storeId }
      );
      const admins = await mongoose.model("User").find({ role: "admin" });
      for (const admin of admins) {
        await createNotification(
          admin._id,
          "admin",
          "info",
          "store",
          `Store ${store.storeName} status updated to pending.`,
          "/admin/manage-businesses",
          { storeId }
        );
      }
    }
    await store.save();

    res.status(200).json({ message: `Store ${status} successfully`, store });
  } catch (error) {
    console.error("Error updating store status:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Update store
exports.updateStore = async (req, res) => {
  try {
    const { storeData } = req.body;
    const files = req.files;
    const store = await Store.findOne({ sellerId: req.user._id });
    if (!store) {
      return res.status(404).json({ message: "Store not found" });
    }

    const parsedStoreData = JSON.parse(storeData || "{}");
    const updateData = {};

    // Fields allowed for editing/updating
    const allowedFields = [
      "storeName",
      "storeDescription",
      "addressLine1",
      "addressLine2",
      "city",
      "postalCode",
      "country",
    ];

    // Only allow updates to fields that are editable
    const editableFields =
      store.status === "approved"
        ? allowedFields
        : store.rejectionReasons.map((r) => r.field);
    for (const field of editableFields) {
      if (parsedStoreData[field] !== undefined) {
        updateData[field] = parsedStoreData[field];
      }
    }

    // Handle file uploads
    if (files.storeLogo) {
      if (store.storeLogo && store.storeLogo !== files.storeLogo[0].filename) {
        const oldLogoPath = path.join(__dirname, "../public", store.storeLogo);
        if (fs.existsSync(oldLogoPath)) fs.unlinkSync(oldLogoPath);
      }
      updateData.storeLogo = `/uploads/${files.storeLogo[0].filename}`;
    }
    if (files.coverImage) {
      if (
        store.coverImage &&
        store.coverImage !== files.coverImage[0].filename
      ) {
        const oldCoverPath = path.join(
          __dirname,
          "../public",
          store.coverImage
        );
        if (fs.existsSync(oldCoverPath)) fs.unlinkSync(oldCoverPath);
      }
      updateData.coverImage = `/uploads/${files.coverImage[0].filename}`;
    }

    // Update store
    Object.assign(store, updateData);
    store.updatedAt = Date.now();
    if (store.status === "rejected") {
      store.status = "pending"; // Set to pending after resubmission
      store.rejectionReasons = []; // Clear rejection reasons
    }
    await store.save();

    // Notify admins for resubmission
    if (store.status === "pending") {
      const admins = await Admin.find({});
      for (const admin of admins) {
        await createNotification(
          admin._id,
          "admin",
          "info",
          "store",
          `Store ${store.storeName} has been resubmitted for approval.`,
          "/admin/manage-businesses",
          { storeId: store._id }
        );
      }
    }

    // Notify seller
    await createNotification(
      req.user._id,
      "seller",
      "info",
      "store",
      `Your store ${store.storeName} has been updated${
        store.status === "pending" ? " and is pending approval" : ""
      }.`,
      "/seller/store-details",
      { storeId: store._id }
    );

    res.status(200).json({ message: "Store updated successfully", store });
  } catch (error) {
    console.error("Error updating store:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Get top verified exporters (public)
exports.getTopVerifiedExporters = async (req, res) => {
  try {
    const premiumStores = await Store.find({
      status: "approved",
    })
      .populate({
        path: "sellerId",
        match: {
          isActive: true,
        },
        select: "membership isActive",
      })
      .select("storeName storeLogo storeDescription country _id")
      .limit(6)
      .sort({ createdAt: -1 })
      .lean();

    // Filter out stores where sellerId is null (no matching premium membership)
    const filteredStores = premiumStores
      // .filter((store) => store.sellerId)
      .map((store) => ({
        _id: store._id,
        storeName: store.storeName,
        storeLogo: store.storeLogo,
        storeDescription: store.storeDescription,
        country: store.country,
      }));

    res.status(200).json({
      success: true,
      stores: filteredStores,
    });
  } catch (error) {
    console.error("Error fetching top verified exporters:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// exports.getTopVerifiedExportersAdmin = async (req, res) => {
//   try {
//     const premiumStores = await Store.find({
//       status: "approved",
//     })
//       .populate({
//         path: "sellerId",
//         match: {
//           isActive: true,
//         },
//         select: "membership isActive",
//       })
//       .limit(6)
//       .sort({ createdAt: -1 })
//       .lean();

//     res.status(200).json({
//       success: true,
//       stores: premiumStores,
//     });
//   } catch (error) {
//     console.error("Error fetching top verified exporters:", error);
//     res.status(500).json({ message: "Server error" });
//   }
// };

exports.getTopVerifiedExportersAdmin = async (req, res) => {
  const { page = 1, limit = 10 } = req.query;

  try {
    // Fetch all orders (excluding cancelled/returned)
    const allOrders = await Order.find({
      status: { $nin: ["Cancelled", "Return"] },
    }).populate({
      path: "product",
      select: "catalog",
      populate: {
        path: "catalog",
        select: "storeId",
      },
    });

    const calculateStoreStats = (orders) => {
      const stats = {
        counts: {},
        totals: {},
        products: {},
      };

      orders.forEach((order) => {
        if (order.product?.catalog?.storeId) {
          const storeId = order.product.catalog.storeId.toString();
          stats.counts[storeId] = (stats.counts[storeId] || 0) + 1;
          stats.totals[storeId] =
            (stats.totals[storeId] || 0) + (order.total || 0);
          stats.products[storeId] =
            (stats.products[storeId] || 0) + (order.quantity || 1);
        }
      });

      return stats;
    };

    // Calculate overall statistics
    const overallStats = calculateStoreStats(allOrders);

    // Get stores with pagination
    const allStores = await Store.find({})
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit));

    // Get detailed statistics for each store
    const storesWithStats = await Promise.all(
      allStores.map(async (store) => {
        const catalogs = await Catalog.find({ storeId: store._id }).select(
          "_id"
        );
        const catalogIds = catalogs.map((c) => c._id);

        // Get product count for this store
        const productCount = await Product.countDocuments({
          catalog: { $in: catalogIds },
        });

        // Get review statistics
        const reviewStats = await Product.aggregate([
          {
            $match: {
              catalog: { $in: catalogIds },
            },
          },
          {
            $group: {
              _id: null,
              totalReviews: { $sum: "$rating.count" },
              avgRating: { $avg: "$rating.average" },
            },
          },
        ]);

        const storeId = store._id.toString();
        return {
          ...store.toObject(),
          orderCount: overallStats.counts[storeId] || 0,
          orderTotal: overallStats.totals[storeId] || 0,
          productsSold: overallStats.products[storeId] || 0,
          totalProducts: productCount, // Added total products count
          reviewStats: {
            totalReviews: reviewStats[0]?.totalReviews || 0,
            avgRating: reviewStats[0]?.avgRating || 0,
          },
        };
      })
    );

    // Sort by order count (descending)
    storesWithStats.sort((a, b) => b.orderCount - a.orderCount);

    const total = await Store.countDocuments({});

    res.json({
      stores: storesWithStats,
      total,
      limits: Number(limit),
      pages: Number(page),
    });
  } catch (err) {
    res.status(500).json({
      message: err.message,
      error: process.env.NODE_ENV === "development" ? err.stack : undefined,
    });
  }
};
// Get store by ID (public)
exports.getStoreById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid store ID" });
    }

    const store = await Store.findById(id)
      .populate("sellerId", "email companyName firstName lastName")
      .lean();

    if (!store) {
      return res.status(404).json({ message: "Store not found" });
    }

    res.status(200).json({
      success: true,
      store,
    });
  } catch (error) {
    console.error("Error fetching store by ID:", error);
    res.status(500).json({ message: "Server error" });
  }
};

exports.topStoresByTimeController = async (req, res) => {
  const { page = 1, limit = 10, period } = req.query;

  try {
    const now = new Date();

    const yearlyStartDate = new Date(now.getFullYear(), 0, 1);
    const yearlyOrderFilter = {
      createdAt: { $gte: yearlyStartDate },
      status: { $nin: ["Cancelled", "Return"] },
    };

    const monthlyStartDate = new Date();
    monthlyStartDate.setDate(monthlyStartDate.getDate() - 29);
    const monthlyOrderFilter = {
      createdAt: { $gte: monthlyStartDate },
      status: { $nin: ["Cancelled", "Return"] },
    };

    // Fetch all orders needed for calculations
    const [yearlyOrders, monthlyOrders, allOrders] = await Promise.all([
      Order.find(yearlyOrderFilter).populate({
        path: "product",
        select: "catalog",
        populate: {
          path: "catalog",
          select: "storeId",
        },
      }),
      Order.find(monthlyOrderFilter).populate({
        path: "product",
        select: "catalog",
        populate: {
          path: "catalog",
          select: "storeId",
        },
      }),
      Order.find({ status: { $nin: ["Cancelled", "Return"] } }).populate({
        path: "product",
        select: "catalog",
        populate: {
          path: "catalog",
          select: "storeId",
        },
      }),
    ]);

    const calculateStoreStats = (orders) => {
      const orderCounts = {};
      const orderTotals = {};

      orders.forEach((order) => {
        if (order.product?.catalog?.storeId) {
          const storeId = order.product.catalog.storeId.toString();
          orderCounts[storeId] = (orderCounts[storeId] || 0) + 1;
          orderTotals[storeId] =
            (orderTotals[storeId] || 0) + (order.total || 0);
        }
      });

      return { counts: orderCounts, totals: orderTotals };
    };

    // Calculate product counts (overall, not time-based)
    const calculateProductCounts = (orders) => {
      const productCounts = {};

      orders.forEach((order) => {
        if (order.product?.catalog?.storeId) {
          const storeId = order.product.catalog.storeId.toString();
          productCounts[storeId] =
            (productCounts[storeId] || 0) + (order.quantity || 1);
        }
      });

      return productCounts;
    };

    const yearlyStats = calculateStoreStats(yearlyOrders);
    const monthlyStats = calculateStoreStats(monthlyOrders);
    const overallProductCounts = calculateProductCounts(allOrders);

    const allStores = await Store.find({})
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit));

    let stores = allStores.map((store) => {
      const storeId = store._id.toString();
      return {
        ...store.toObject(),
        yearlyOrderCount: yearlyStats.counts[storeId] || 0,
        yearlyOrderTotal: yearlyStats.totals[storeId] || 0,
        monthlyOrderCount: monthlyStats.counts[storeId] || 0,
        monthlyOrderTotal: monthlyStats.totals[storeId] || 0,
        totalProductsSold: overallProductCounts[storeId] || 0, // Overall product count
      };
    });

    // Sorting logic remains the same
    if (period === "year") {
      stores.sort((a, b) => b.yearlyOrderCount - a.yearlyOrderCount);
    } else if (period === "month") {
      stores.sort((a, b) => b.monthlyOrderCount - a.monthlyOrderCount);
    }

    const total = await Store.countDocuments({});

    res.json({
      stores,
      total,
      limits: Number(limit),
      pages: Number(page),
    });
  } catch (err) {
    res.status(500).json({
      message: err.message,
      error: process.env.NODE_ENV === "development" ? err.stack : undefined,
    });
  }
};
