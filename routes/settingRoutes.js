const express = require("express");
const router = express.Router();
const {
  getAllSettings,
  getGeneralSettings,
  updateGeneralSettings,
  getSocialMediaSettings,
  updateSocialMediaSettings,
  getSEOSettings,
  updateSEOSettings,
  getSocialLoginSettings,
  updateSocialLoginSettings,
} = require("../controller/settingController");
const { isAdmin } = require("../middleware/adminMiddleware");

// Get all settings (admin only)
router.get("/", isAdmin, getAllSettings);

// General Settings Routes
router.get("/general", getGeneralSettings);

router.put("/general", isAdmin, updateGeneralSettings);

// Social Media Settings Routes
router.get("/social-media", getSocialMediaSettings);

router.put("/social-media", isAdmin, updateSocialMediaSettings);

// SEO Settings Routes
router.get("/seo", isAdmin, getSEOSettings);

router.put("/seo", isAdmin, updateSEOSettings);

// Social Login Settings Routes
router.get("/social-login", isAdmin, getSocialLoginSettings);

router.put("/social-login", isAdmin, updateSocialLoginSettings);

module.exports = router;
