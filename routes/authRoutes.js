const express = require("express");
const router = express.Router();
const {
  register,
  login,
  getUserProfile,
  getSupplierInfo,
  updateProfile,
  getAllUserByAdmin,
  updateUserStatus,
  deleteUser,
  getUserStats,
} = require("../controller/authController");
const {
  protect,
  authorize,
  requirePremium,
} = require("../middleware/authMiddleware");
const { isAdmin } = require("../middleware/adminMiddleware");
const passport = require("passport");

router.post("/register", register);
router.post("/login", login);
router.get("/profile", protect, getUserProfile);
router.get("/user-stats", isAdmin, getUserStats);
router.get("/supplier/:seller", getSupplierInfo);
router.patch("/profile/update", protect, updateProfile);

router.get("/alluser-admin", isAdmin, getAllUserByAdmin);
router.patch("/:userId/status", isAdmin, updateUserStatus);
router.delete("/:userId", isAdmin, deleteUser);

router.get(
  "/google",
  passport.authenticate("google", {
    session: false,
    scope: ["profile", "email"],
  })
);

router.get(
  "/google/callback",
  passport.authenticate("google", {
    session: false,
    // failureRedirect: `${process.env.FRONTEND_URL}/auth/login`,
    failureRedirect: `http://localhost:3000/auth/login`,
  }),
  (req, res) => {
    const { token } = req.user;
    console.log("callback google token ==", token);

    res.redirect(`http://localhost:3000/checking?token=${token}`);
    // res.redirect(`http://localhost:3000/buyer/dashboard?token=${token}`);
  }
);

router.get(
  "/facebook",
  passport.authenticate("facebook", { session: false, scope: ["email"] })
);
router.get(
  "/facebook/callback",
  passport.authenticate("facebook", {
    session: false,
    failureRedirect: "/login",
  }),
  (req, res) => {
    const { token } = req.user;
    // res.redirect(`http://localhost:3000/seller/dashboard`);
    res.redirect(`http://localhost:3000/checking?token=${token}`);
  }
);

module.exports = router;
