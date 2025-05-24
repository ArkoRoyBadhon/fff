const express = require("express");
const router = express.Router();
const { protect, authorize } = require("../middleware/authMiddleware");
const { isAdmin } = require("../middleware/adminMiddleware");
const {
  submitLeadGeneration,
  getAllLeads,
  getLeadById,
} = require("../controller/leadGenerationController");

// Submit lead generation form (Authenticated users only)
router.post("/submit", protect, submitLeadGeneration);

// Admin routes to access lead generation data
router.get("/", isAdmin, getAllLeads);
router.get("/:id", isAdmin, getLeadById);

module.exports = router;
