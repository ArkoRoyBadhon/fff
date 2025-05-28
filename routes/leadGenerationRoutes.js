const express = require("express");
const router = express.Router();
const { protect, authorize } = require("../middleware/authMiddleware");
const { isAdmin } = require("../middleware/adminMiddleware");
const {
  submitLeadGeneration,
  getAllLeads,
  getLeadById,
} = require("../controller/leadGenerationController");

// Check if user has submitted a lead (Authenticated users only)
router.get("/check-submission", protect, async (req, res) => {
  try {
    const lead = await require("../models/LeadGeneration").findOne({ userId: req.user._id });
    res.status(200).json({ hasSubmitted: !!lead });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Submit lead generation form (Authenticated users only)
router.post("/submit", protect, submitLeadGeneration);

// Admin routes to access lead generation data
router.get("/", isAdmin, getAllLeads);
router.get("/:id", isAdmin, getLeadById);

module.exports = router;