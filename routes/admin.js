const express = require("express");
const router = express.Router();
const {
  adminLogin,
  getAdminProfile,
  addNewAdmin,
  getAllAdmins,
  deleteAdmin,
  updateAdminStatus,
} = require("../controller/adminAuth");
const { isAdmin } = require("../middleware/adminMiddleware");

router.post("/login", adminLogin);
router.get("/profile", isAdmin, getAdminProfile);
router.get("/dashboard", isAdmin, (req, res) => {
  res.json({ message: "Admin dashboard" });
});
router.post("/addNewAdmin", isAdmin, addNewAdmin);
router.get("/getAllAdmins", isAdmin, getAllAdmins);

// updatestatus, delete
router.patch("/:adminId/status", isAdmin, updateAdminStatus);
router.delete("/:adminId", isAdmin, deleteAdmin);

module.exports = router;
