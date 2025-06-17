const Catalog = require("../models/Catalog");
const Store = require("../models/StoreSetup");
const Notification = require("../models/Notification");
const Admin = require("../models/Admin");
const path = require("path");
const fs = require("fs");

// Helper function to create a notification (reusing the existing one)
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

// Create a catalog
exports.createCatalog = async (req, res) => {
  try {
    const { catalogName, categories, subCategories, subSubCategories } =
      req.body;
    const files = req.files;

    // Validate required fields
    if (!catalogName || !categories || !subCategories) {
      return res.status(400).json({ message: "All fields are required" });
    }
    if (!files.image || !files.image[0]) {
      return res.status(400).json({ message: "Image is required" });
    }

    // Check if the seller has an approved store
    const store = await Store.findOne({ sellerId: req.user._id });
    if (!store) {
      return res
        .status(404)
        .json({ message: "No store found for this seller" });
    }
    if (store.status !== "approved") {
      return res
        .status(403)
        .json({ message: "Store must be approved before creating a catalog" });
    }

    // Parse array fields
    const parsedCategories = JSON.parse(categories);
    const parsedSubCategories = JSON.parse(subCategories);
    const parsedSubSubCategories = JSON.parse(subSubCategories);

    // Create the catalog
    const catalog = new Catalog({
      storeId: store._id,
      sellerId: req.user._id,
      catalogName,
      categories: parsedCategories,
      subCategories: parsedSubCategories,
      subSubCategories: parsedSubSubCategories,
      image: `/uploads/${files.image[0].filename}`,
    });

    await catalog.save();

    // Notify admins
    const admins = await Admin.find({});
    for (const admin of admins) {
      await createNotification(
        admin._id,
        "admin",
        "info",
        "catalog",
        `New catalog submitted by seller: ${catalogName}`,
        "/admin/manage-catalog",
        { catalogId: catalog._id }
      );
    }

    // Notify seller
    await createNotification(
      req.user._id,
      "seller",
      "info",
      "catalog",
      `Your catalog ${catalogName} is pending approval.`,
      "/seller/store",
      { catalogId: catalog._id }
    );

    res
      .status(201)
      .json({ message: "Catalog submitted successfully", catalog });
  } catch (error) {
    console.error("Error creating catalog:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Edit a catalog
exports.editCatalog = async (req, res) => {
  try {
    const {
      catalogId,
      catalogName,
      categories,
      subCategories,
      subSubCategories,
    } = req.body;
    const files = req.files;

    // Validate required fields
    if (!catalogId || !catalogName || !categories || !subCategories) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // Find the catalog
    const catalog = await Catalog.findOne({
      _id: catalogId,
      sellerId: req.user._id,
    });
    if (!catalog) {
      return res.status(404).json({ message: "Catalog not found" });
    }

    // Parse array fields
    const parsedCategories = JSON.parse(categories);
    const parsedSubCategories = JSON.parse(subCategories);
    const parsedSubSubCategories = JSON.parse(subSubCategories);

    // Determine the new status based on catalog status and changes
    let newStatus = catalog.status;
    const isCatalogNameChanged = catalog.catalogName !== catalogName;
    const areOtherFieldsChanged =
      JSON.stringify(parsedCategories) !== JSON.stringify(catalog.categories) ||
      JSON.stringify(parsedSubCategories) !==
        JSON.stringify(catalog.subCategories) ||
      (files && files.image && files.image[0]);

    if (catalog.status === "approved") {
      if (isCatalogNameChanged) {
        // If catalogName is changed, set status to pending and require admin approval
        newStatus = "pending";
      } else if (areOtherFieldsChanged) {
        // If only other fields are changed, keep status as approved (no admin approval needed)
        newStatus = "approved";
      }
    } else if (catalog.status === "rejected") {
      // For rejected catalogs, any update requires admin approval
      newStatus = "pending";
    }

    // Update catalog fields
    catalog.catalogName = catalogName;
    catalog.categories = parsedCategories;
    catalog.subCategories = parsedSubCategories;
    catalog.subSubCategories = parsedSubSubCategories;
    catalog.status = newStatus;
    if (newStatus === "pending") {
      catalog.rejectionReasons = []; // Clear rejection reasons when pending
    }
    catalog.updatedAt = Date.now();

    // Handle image update if a new image is uploaded
    if (files && files.image && files.image[0]) {
      // Delete the old image if it exists
      if (catalog.image) {
        const oldImagePath = path.join(__dirname, "../public", catalog.image);
        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath);
        }
      }
      catalog.image = `/uploads/${files.image[0].filename}`;
    }

    await catalog.save();

    // Notify admins and seller only if status changes to pending
    if (newStatus === "pending") {
      const admins = await Admin.find({});
      for (const admin of admins) {
        await createNotification(
          admin._id,
          "admin",
          "info",
          "catalog",
          `Catalog updated by seller: ${catalogName}`,
          "/admin/manage-catalogs",
          { catalogId: catalog._id }
        );
      }
      await createNotification(
        req.user._id,
        "seller",
        "info",
        "catalog",
        `Your catalog ${catalogName} has been updated and is pending approval.`,
        "/seller/store/catalog-details",
        { catalogId: catalog._id }
      );
    }

    res.status(200).json({ message: "Catalog updated successfully", catalog });
  } catch (error) {
    console.error("Error updating catalog:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Get catalog status
exports.getCatalogStatus = async (req, res) => {
  try {
    const catalog = await Catalog.find({ sellerId: req.user._id }).select(
      "status rejectionReasons"
    );
    if (!catalog || catalog.length === 0) {
      return res.status(404).json({ message: "No catalogs found" });
    }
    res.status(200).json({
      catalogs: catalog.map((cat) => ({
        status: cat.status,
        rejectionReasons: cat.rejectionReasons || [],
        catalogName: cat.catalogName,
      })),
    });
  } catch (error) {
    console.error("Error fetching catalog status:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Get all catalogs for a seller
exports.getCatalogs = async (req, res) => {
  try {
    const catalogs = await Catalog.find({ sellerId: req.user._id })
      .populate("storeId", "storeName")
      .populate("categories")
      .populate("subCategories")
      .populate("subSubCategories")
      .sort({ createdAt: -1 });

    if (!catalogs || catalogs.length === 0) {
      return res.status(404).json({ message: "No catalogs found" });
    }

    res.status(200).json({ catalogs });
  } catch (error) {
    console.error("Error fetching catalogs:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Get all catalogs (for admin)
exports.getAllCatalogs = async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    const query = {};
    if (status) {
      query.status = status;
    }

    const catalogs = await Catalog.find(query)
      .populate("sellerId", "email")
      .populate("storeId", "storeName")
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });

    const total = await Catalog.countDocuments(query);

    res.status(200).json({
      catalogs,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Error fetching all catalogs:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Admin approve/reject catalog
exports.updateCatalogStatus = async (req, res) => {
  try {
    const { catalogId, status, rejectionReasons } = req.body;
    if (!["approved", "rejected", "pending"].includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const catalog = await Catalog.findById(catalogId).populate(
      "sellerId",
      "email"
    );
    if (!catalog) {
      return res.status(404).json({ message: "Catalog not found" });
    }

    catalog.status = status;
    if (status === "rejected" && rejectionReasons) {
      catalog.rejectionReasons = rejectionReasons;
      await createNotification(
        catalog.sellerId._id,
        "seller",
        "error",
        "catalog",
        `Your catalog ${
          catalog.catalogName
        } has been rejected. Reasons: ${rejectionReasons
          .map((r) => `${r.field}: ${r.reason}`)
          .join(", ")}.`,
        "/seller/store/catalog-details",
        { catalogId, rejectionReasons }
      );
    } else if (status === "approved") {
      catalog.rejectionReasons = [];
      await createNotification(
        catalog.sellerId._id,
        "seller",
        "success",
        "catalog",
        `Your catalog ${catalog.catalogName} has been approved.`,
        "/seller/store/catalog-details",
        { catalogId }
      );
    } else if (status === "pending") {
      catalog.rejectionReasons = [];
      await createNotification(
        catalog.sellerId._id,
        "seller",
        "info",
        "catalog",
        `Your catalog ${catalog.catalogName} is pending approval.`,
        "/seller/store/catalog-details",
        { catalogId }
      );
      const admins = await Admin.find({});
      for (const admin of admins) {
        await createNotification(
          admin._id,
          "admin",
          "info",
          "catalog",
          `Catalog ${catalog.catalogName} status updated to pending.`,
          "/admin/manage-catalogs",
          { catalogId }
        );
      }
    }
    await catalog.save();

    res
      .status(200)
      .json({ message: `Catalog ${status} successfully`, catalog });
  } catch (error) {
    console.error("Error updating catalog status:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Delete a catalog (for seller)
exports.deleteCatalog = async (req, res) => {
  try {
    const { catalogId } = req.params;

    const catalog = await Catalog.findOne({
      _id: catalogId,
      sellerId: req.user._id,
    });
    if (!catalog) {
      return res.status(404).json({ message: "Catalog not found" });
    }

    // Check if the catalog is in pending status
    if (catalog.status === "pending") {
      return res
        .status(403)
        .json({ message: "Cannot delete a catalog that is pending approval" });
    }

    // Delete the catalog
    await Catalog.deleteOne({ _id: catalogId });

    // Notify the seller
    await createNotification(
      req.user._id,
      "seller",
      "info",
      "catalog",
      `Your catalog ${catalog.catalogName} has been deleted.`,
      "/seller/store/catalog-details",
      { catalogId }
    );

    // Notify admins
    const admins = await Admin.find({});
    for (const admin of admins) {
      await createNotification(
        admin._id,
        "admin",
        "info",
        "catalog",
        `Catalog ${catalog.catalogName} has been deleted by seller.`,
        "/admin/manage-catalogs",
        { catalogId }
      );
    }

    res.status(200).json({ message: "Catalog deleted successfully" });
  } catch (error) {
    console.error("Error deleting catalog:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Get file preview (reusing the existing one from store setup)
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
