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
      .populate("supplierProfile");

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
      buyerProfile: user.buyerProfile,
      supplierProfile: user.supplierProfile,
      lastLogin: user.lastLogin,
      profileImage: user.profileImage,
    };

    res.json(profileResponse);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

exports.getSupplierInfo = async (req, res) => {
  try {
    const user = await User.findById(req.params.seller)
      .select("-password")
      .populate("storeId");
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
      role: req.user.role,
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
