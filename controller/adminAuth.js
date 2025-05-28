const Admin = require("../models/Admin");
const jwt = require("jsonwebtoken");

const generateAdminToken = (id) => {
  return jwt.sign(
    {
      id,
      role: "admin",
    },
    process.env.JWT_SECRET,
    {
      expiresIn: "1d",
    }
  );
};

exports.adminLogin = async (req, res) => {
  const { email, password } = req.body;

  try {
    const admin = await Admin.findOne({ email }).select("+password");

    if (!admin) {
      return res.status(401).json({
        success: false,
        message: "Admin not found",
      });
    }

    const isMatch = await admin.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    const token = generateAdminToken(admin._id);
    const adminData = await Admin.findById(admin._id).select("-password");

    res.json({
      success: true,
      token,
      admin: adminData,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

exports.getAdminProfile = async (req, res) => {
  try {
    const admin = await Admin.findById(req.admin._id)
      .select("-password")
      .lean();
      
    if (!admin) {
      return res.status(404).json({ 
        success: false, 
        message: "Admin not found" 
      });
    }

    if (!["admin", "super admin"].includes(admin.role.toLowerCase())) {
      return res.status(403).json({
        success: false,
        message: "Insufficient privileges"
      });
    }

    res.json(admin);
  } catch (error) {
    console.error("Admin profile error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Server error" 
    });
  }
};