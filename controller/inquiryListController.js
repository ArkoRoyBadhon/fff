const InquiryList = require("../models/InquiryList");

// Create a new inquiry
const createInquiry = async (req, res) => {
  try {
    const { firstName, lastName, email, phone, message } = req.body;

    // Basic validation
    if (!firstName || !lastName || !email || !message) {
      return res.status(400).json({
        success: false,
        message: "First name, last name, email, and message are required",
      });
    }

    // Create new inquiry
    const newInquiry = new InquiryList({
      firstName,
      lastName,
      email,
      phone: phone || "", // Set to empty string if not provided
      message,
      status: "new", // Default status
    });

    // Save to database
    const savedInquiry = await newInquiry.save();

    res.status(201).json({
      success: true,
      message: "Inquiry created successfully",
      data: savedInquiry,
    });
  } catch (error) {
    console.error("Error creating inquiry:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

const getAllInquiries = async (req, res) => {
  try {
    const { status } = req.query;
    let matchStage = {};

    if (status && status !== "all") {
      matchStage = { status };
    }

    const result = await InquiryList.aggregate([
      {
        $facet: {
          inquiries: [{ $match: matchStage }, { $sort: { createdAt: -1 } }],
          allStats: [
            {
              $group: {
                _id: null,
                total: { $sum: 1 },
                new: { $sum: { $cond: [{ $eq: ["$status", "new"] }, 1, 0] } },
                in_progress: {
                  $sum: { $cond: [{ $eq: ["$status", "in_progress"] }, 1, 0] },
                },
                resolved: {
                  $sum: { $cond: [{ $eq: ["$status", "resolved"] }, 1, 0] },
                },
              },
            },
          ],
        },
      },
      {
        $project: {
          inquiries: 1,
          stats: { $arrayElemAt: ["$allStats", 0] },
        },
      },
    ]);

    const { inquiries, stats } = result[0] || { inquiries: [], stats: {} };

    // Ensure stats has default values
    const finalStats = {
      total: stats?.total || 0,
      new: stats?.new || 0,
      in_progress: stats?.in_progress || 0,
      resolved: stats?.resolved || 0,
    };

    res.status(200).json({
      success: true,
      data: inquiries,
      stats: {
        ...finalStats,
        count: inquiries.length,
        newPercentage: finalStats.total
          ? Math.round((finalStats.new / finalStats.total) * 100)
          : 0,
        inProgressPercentage: finalStats.total
          ? Math.round((finalStats.in_progress / finalStats.total) * 100)
          : 0,
        resolvedPercentage: finalStats.total
          ? Math.round((finalStats.resolved / finalStats.total) * 100)
          : 0,
      },
    });
  } catch (error) {
    console.error("Error fetching inquiries:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

// Get single inquiry by ID
const getInquiryById = async (req, res) => {
  try {
    const inquiry = await InquiryList.findById(req.params.id);

    if (!inquiry) {
      return res.status(404).json({
        success: false,
        message: "Inquiry not found",
      });
    }

    res.status(200).json({
      success: true,
      data: inquiry,
    });
  } catch (error) {
    console.error("Error fetching inquiry:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

// Update inquiry status
const updateInquiryStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const { id } = req.params;

    if (!status || !["new", "in_progress", "resolved"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Valid status is required (new, in_progress, resolved)",
      });
    }

    const updatedInquiry = await InquiryList.findByIdAndUpdate(
      id,
      { status },
      { new: true, runValidators: true }
    );

    if (!updatedInquiry) {
      return res.status(404).json({
        success: false,
        message: "Inquiry not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Inquiry status updated",
      data: updatedInquiry,
    });
  } catch (error) {
    console.error("Error updating inquiry:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

module.exports = {
  createInquiry,
  getAllInquiries,
  getInquiryById,
  updateInquiryStatus,
};
