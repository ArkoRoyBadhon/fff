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
        message: "Admin not found",
      });
    }

    if (!["admin", "super admin"].includes(admin.role.toLowerCase())) {
      return res.status(403).json({
        success: false,
        message: "Insufficient privileges",
      });
    }

    res.json(admin);
  } catch (error) {
    console.error("Admin profile error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

exports.addNewAdmin = async (req, res) => {
  try {
    console.log("req.body", req.body);
    const newAdmin = await Admin.create({
      ...req.body,
      username: req.body.email,
    });

    res.status(201).json(newAdmin);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

exports.getAllAdmins = async (req, res) => {
  try {
    const admins = await Admin.find().select("-password");
    res.status(200).json(admins);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

exports.updateAdminStatus = async (req, res) => {
  try {
    const { adminId } = req.params;
    const { isActive } = req.body;

    if (typeof isActive !== "boolean") {
      return res.status(400).json({ message: "Invalid status value" });
    }

    const updatedAdmin = await Admin.findByIdAndUpdate(
      adminId,
      { isActive },
      { new: true, runValidators: true }
    ).select("-password -refreshToken");

    if (!updatedAdmin) {
      return res.status(404).json({ message: "Admin not found" });
    }

    res.json({
      message: "Admin status updated successfully",
      admin: updatedAdmin,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

exports.deleteAdmin = async (req, res) => {
  try {
    const admin = await Admin.findByIdAndDelete(req.params.adminId);
    if (!admin) {
      return res.status(404).json({ message: "Admin not found" });
    }
    res.status(200).json({ message: "Admin deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};
