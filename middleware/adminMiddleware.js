const jwt = require("jsonwebtoken");
const Admin = require("../models/Admin");
const Employee = require("../models/Employee");

exports.isAdmin = async (req, res, next) => {
  let token;

  if (req.headers.authorization?.startsWith("Bearer")) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Not authorized - No token provided",
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Admin access required",
      });
    }

    let admin;

    admin =
      (await Admin.findById(decoded.id).select("-password")) ||
      (await Employee.findById(decoded.id).select("-password"));
    if (!admin) {
      return res.status(401).json({
        success: false,
        message: "Admin not found",
      });
    }

    req.admin = admin;
    next();
  } catch (error) {
    console.error("Token verification error:", error.message);

    let message = "Not authorized";
    if (error.name === "TokenExpiredError") {
      message = "Session expired - Please login again";
    } else if (error.name === "JsonWebTokenError") {
      message = "Invalid token";
    }

    return res.status(401).json({
      success: false,
      message,
    });
  }
};
