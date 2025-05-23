const express = require("express");
const router = express.Router();
const { adminLogin, getAdminProfile } = require("../controller/adminAuth");
const { isAdmin } = require("../middleware/adminMiddleware");

router.post("/login", adminLogin);
router.get("/profile", isAdmin, getAdminProfile);
router.get("/dashboard", isAdmin, (req, res) => {
  res.json({ message: "Admin dashboard" });
});

module.exports = router;