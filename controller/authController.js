const Package = require("../models/Package");
const User = require("../models/User");
const jwt = require("jsonwebtoken");

const generateToken = (id, role) => {
  return jwt.sign({ id, role }, process.env.JWT_SECRET, {
    expiresIn: "30d",
  });
};

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res) => {
  const {
    companyName,
    firstName,
    lastName,
    email,
    phoneNumber,
    country,
    password,
    role,
  } = req.body;

  try {
    // Validate role
    if (!role || role.length === 0) {
      return res.status(400).json({ message: "At least one role is required" });
    }

    // Check if user exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: "User already exists" });
    }

    // Create user
    const user = await User.create({
      companyName,
      firstName,
      lastName,
      email,
      phoneNumber,
      country,
      password,
      role,
    });

    if (user) {
      const token = generateToken(user._id);
      res.status(201).json({
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        token,
      });

      if (role.includes("seller")) {
        const freePackage = await Package.findOne({
          type: "free",
          isActive: true,
        });
        if (!freePackage) {
          console.warn("No free package found for new seller");
        }
      }
    } else {
      res.status(400).json({ message: "Invalid user data" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

// Update login to handle multiple role
exports.login = async (req, res) => {
  const { email, password, role } = req.body;

  console.log("login user", req.body);

  try {
    const user = await User.findOne({ email }).select("+password");

    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    // Check if requested role is in user's role
    if (!user.role.includes(role)) {
      return res.status(403).json({
        message: `You don't have permission to login as ${role}. Your roles: ${user.role.join(
          ", "
        )}`,
      });
    }

    // Generate token with the specific role
    const token = generateToken(user._id, role);

    // Update last login
    user.lastLogin = new Date();
    await user.save({ validateBeforeSave: false });

    res.json({
      _id: user._id,
      name: `${user.firstName} ${user.lastName}`,
      email: user.email,
      role: role, // The specific role used for login
      allRoles: user.role, // All available roles
      token,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

// @desc    Get user profile
// @route   GET /api/auth/profile
// @access  Private
exports.getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .select("-password")
      .populate("buyerProfile")
      .populate("supplierProfile")
      .populate("currentPackage")
      .populate("subscriptionId");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const profileResponse = {
      _id: user._id,
      companyName: user.companyName,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phoneNumber: user.phoneNumber,
      country: user.country,
      role: req.user.activeRole,
      allRoles: user.role,
      profileImage: user.profileImage,
      buyerProfile: user.buyerProfile,
      supplierProfile: user.supplierProfile,
      lastLogin: user.lastLogin,
      subscriptionId: user.subscriptionId,
      subscriptionStatus: user.subscriptionStatus,
      packageConditions: user.packageConditions,
      currentPackage: user.currentPackage,
      stripeCustomerId: user.stripeCustomerId,
      paymentMethods: user.paymentMethods,
    };

    res.json(profileResponse);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

// @desc    Get supplier info
// @route   GET /api/auth/supplier/:seller
// @access  Public
exports.getSupplierInfo = async (req, res) => {
  try {
    const user = await User.findById(req.params.seller)
      .select("-password")
      .populate("storeId");
    if (!user) {
      return res.status(404).json({ message: "Supplier not found" });
    }
    res.json(user);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

// @desc    Update user profile
// @route   PUT /api/auth/profile
// @access  Private
exports.updateProfile = async (req, res) => {
  const {
    companyName,
    firstName,
    lastName,
    email,
    phoneNumber,
    country,
    currentPassword,
    newPassword,
    profileImage,
  } = req.body;

  try {
    const user = await User.findById(req.user._id).select("+password");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (email && email !== user.email) {
      const emailExists = await User.findOne({ email });
      if (emailExists) {
        return res.status(400).json({ message: "Email already in use" });
      }
      user.email = email;
    }

    if (companyName) user.companyName = companyName;
    if (firstName) user.firstName = firstName;
    if (lastName) user.lastName = lastName;
    if (phoneNumber) user.phoneNumber = phoneNumber;
    if (country) user.country = country;
    if (profileImage) user.profileImage = profileImage;

    if (currentPassword && newPassword) {
      if (!(await user.comparePassword(currentPassword))) {
        return res
          .status(401)
          .json({ message: "Current password is incorrect" });
      }

      user.password = newPassword;
    }

    const updatedUser = await user.save();

    const response = {
      _id: updatedUser._id,
      companyName: updatedUser.companyName,
      firstName: updatedUser.firstName,
      lastName: updatedUser.lastName,
      email: updatedUser.email,
      phoneNumber: updatedUser.phoneNumber,
      country: updatedUser.country,
      role: req.user.activeRole,
      profileImage: updatedUser.profileImage,
      message: "Profile updated successfully",
    };

    if (currentPassword && newPassword) {
      response.passwordChanged = true;
    }

    res.json(response);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Error updating profile",
      error: error.message,
    });
  }
};

exports.getAllUserByAdmin = async (req, res) => {
  try {
    const { role, search, status } = req.query;
    const query = {};

    if (role) {
      query.role = role;
    }

    if (search) {
      const searchRegex = new RegExp(search, "i");
      query.$or = [
        { firstName: searchRegex },
        { lastName: searchRegex },
        { email: searchRegex },
        { phoneNumber: searchRegex },
        { companyName: searchRegex },
      ];
    }

    if ((status && status === "active") || status === "inactive") {
      query.isActive = status === "active";
    }

    console.log("query ===", query);

    const users = await User.find(query)
      .sort({ createdAt: -1 })
      .select("-password -refreshToken");

    res.json(users);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

exports.updateUserStatus = async (req, res) => {
  try {
    const { userId } = req.params;
    const { isActive } = req.body;

    if (typeof isActive !== "boolean") {
      return res.status(400).json({ message: "Invalid status value" });
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { isActive },
      { new: true, runValidators: true }
    ).select("-password -refreshToken");

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({
      message: "User status updated successfully",
      user: updatedUser,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    await User.findByIdAndDelete(userId);

    res.json({ message: "User deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

exports.getUserStats = async (req, res) => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [
      totalBuyers,
      activeBuyers,
      newBuyers,
      totalSellers,
      activeSellers,
      newSellers,
    ] = await Promise.all([
      User.countDocuments({ role: "buyer" }),
      User.countDocuments({ role: "buyer", isActive: true }),
      User.countDocuments({
        role: "buyer",
        createdAt: { $gte: thirtyDaysAgo },
      }),

      User.countDocuments({ role: "seller" }),
      User.countDocuments({ role: "seller", isActive: true }),
      User.countDocuments({
        role: "seller",
        createdAt: { $gte: thirtyDaysAgo },
      }),
    ]);

    res.json({
      success: true,
      stats: {
        buyers: {
          total: totalBuyers,
          active: activeBuyers,
          new: newBuyers,
        },
        sellers: {
          total: totalSellers,
          active: activeSellers,
          new: newSellers,
        },
        updatedAt: new Date(),
        timeRange: {
          newUsersSince: thirtyDaysAgo,
        },
      },
    });
  } catch (error) {
    console.error("Error fetching user stats:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching user statistics",
    });
  }
};

