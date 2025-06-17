const LeadGeneration = require("../models/LeadGeneration");
const Notification = require("../models/Notification");
const Admin = require("../models/Admin");

// Helper function to create a notification (unchanged)
const createNotification = async (userId, role, type, module, message, link, metadata = {}) => {
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
    console.log(`Notification created for user ${userId} with role ${role}: ${message}`);
  } catch (error) {
    console.error(`Error creating notification for user ${userId}:`, error);
    throw error;
  }
};

// Submit lead generation form
exports.submitLeadGeneration = async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      organization,
      contactNumber,
      email,
      sector,
      interests,
      needsDescription,
      joinKingMansa,
    } = req.body;

    // Ensure user is logged in
    if (!req.user) {
      return res.status(401).json({ message: "User not authenticated" });
    }

    // Check if user has already submitted a lead
    const existingLead = await LeadGeneration.findOne({ userId: req.user._id });
    if (existingLead) {
      return res.status(400).json({ message: "You have already submitted a lead generation form" });
    }

    // Validate required fields
    if (!firstName || !lastName || !organization || !contactNumber || !email || !sector || !interests || !joinKingMansa) {
      return res.status(400).json({ message: "All required fields must be filled" });
    }

    // Create new lead generation entry
    const lead = new LeadGeneration({
      userId: req.user._id,
      firstName,
      lastName,
      organization,
      contactNumber,
      email,
      sector,
      interests,
      needsDescription,
      joinKingMansa,
      hasSubmitted: true,
    });

    await lead.save();

    // Send notification to admins
    try {
      const admins = await Admin.find();
      const currentDateTime = new Date().toLocaleString("en-US", { timeZone: "Asia/Dhaka" });
      for (const admin of admins) {
        await createNotification(
          admin._id,
          "admin",
          "info",
          "lead",
          `New lead submitted at ${currentDateTime} by ${firstName} ${lastName} from ${organization}.`,
          "/admin/manage-leads",
          { leadId: lead._id }
        );
      }
    } catch (notificationError) {
      console.error("Notification error:", notificationError.message);
      // Continue even if notification fails
    }

    res.status(201).json({ message: "Form submitted successfully", lead });
  } catch (error) {
    console.error("Server error:", error.message);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get all lead generation forms (Admin only, unchanged)
exports.getAllLeads = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const leads = await LeadGeneration.find()
      .populate("userId", "email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await LeadGeneration.countDocuments();
    const pages = Math.ceil(total / limit);

    res.status(200).json({
      leads,
      total,
      page,
      pages,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get single lead generation form by ID (Admin only, unchanged)
exports.getLeadById = async (req, res) => {
  try {
    const lead = await LeadGeneration.findById(req.params.id).populate(
      "userId",
      "email"
    );
    if (!lead) {
      return res.status(404).json({ message: "Lead not found" });
    }
    res.status(200).json(lead);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};