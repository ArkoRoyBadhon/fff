const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Admin = require("../models/Admin");

exports.protect = async (req, res, next) => {
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) {
    return res.status(401).json({ message: "Not authorized, no token" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Check the role in the token and query the appropriate model
    let user;
    if (decoded.role === "admin") {
      user = await Admin.findById(decoded.id).select("-password");
      if (!user) {
        return res.status(401).json({ message: "Admin not found" });
      }
    } else {
      user = await User.findById(decoded.id).select("-password");
      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }
    }

    // Attach req.user with the user/admin data and activeRole
    req.user = {
      ...user.toObject(),
      activeRole: decoded.role,
    };

    next();
  } catch (error) {
    console.error("Token verification error:", error.message);
    let message = "Not authorized, token failed";
    if (error.name === "TokenExpiredError") {
      message = "Session expired - Please login again";
    } else if (error.name === "JsonWebTokenError") {
      message = "Invalid token";
    }
    res.status(401).json({ message });
  }
};

exports.authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!allowedRoles.includes(req.user.activeRole)) {
      return res
        .status(403)
        .json({ message: "Not authorized to access this route" });
    }
    next();
  };
};

exports.requirePremium = async (req, res, next) => {
  if (req.user.activeRole !== "admin" && req.user.membership !== "premium") {
    return res.status(403).json({
      message: "Premium membership required to access this feature",
    });
  }
  next();
};
