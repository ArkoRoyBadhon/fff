const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const Package = require("./Package");

const userSchema = new mongoose.Schema(
  {
    profileImage: {
      type: String,
      required: false,
    },
    companyName: {
      type: String,
      trim: true,
      maxlength: [100, "Company name cannot exceed 100 characters"],
    },
    firstName: {
      type: String,
      required: [true, "First name is required"],
      trim: true,
      maxlength: [50, "First name cannot exceed 50 characters"],
    },
    lastName: {
      type: String,
      required: [true, "Last name is required"],
      trim: true,
      maxlength: [50, "Last name cannot exceed 50 characters"],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      trim: true,
      lowercase: true,
      match: [
        /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
        "Please fill a valid email address",
      ],
    },
    phoneNumber: {
      type: String,
      // required: [true, "Phone number is required"],
      trim: true,
    },
    country: {
      type: String,
      required: [true, "Country is required"],
      default: "Bangladesh",
    },
    password: {
      type: String,
      // required: [true, "Password is required"],
      minlength: [8, "Password must be at least 8 characters"],
      select: false,
    },
    role: {
      type: [String],
      enum: ["buyer", "seller"],
      required: [true, "At least one role is required"],
      default: ["buyer"],
      validate: {
        validator: function (v) {
          return v.length > 0;
        },
        message: "At least one role is required",
      },
    },
    subscriptionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subscription",
    },
    subscriptionStatus: {
      type: String,
      enum: ["active", "expired", "none"],
      default: "none",
    },
    packageConditions: {
      current: {
        type: {
          name: String,
          conditions: Object,
          isArchived: {
            type: Boolean,
            default: true,
          },
        },
        default: null,
      },
      basic: {
        maxCatalogs: { type: Number, default: 1 },
        maxProductsPerCatalog: { type: Number, default: 10 },
      },
    },

    currentPackage: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Package",
    },
    lastLogin: {
      type: Date,
    },
    stripeCustomerId: {
      type: String,
      trim: true,
    },
    googleId: {
      type: String,
    },
    faceBookId: {
      type: String,
    },
    paymentMethods: [
      {
        paymentMethodId: { type: String, trim: true },
        last4: { type: String, trim: true },
        brand: { type: String, trim: true },
        expMonth: { type: Number },
        expYear: { type: Number },
      },
    ],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Password hashing middleware
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

// Pre-save hook for new sellers
userSchema.pre("save", async function (next) {
  // Only set basic conditions for new sellers
  if (this.isNew && this.role.includes("seller")) {
    try {
      const freePackage = await Package.findOne({
        type: "free",
        isActive: true,
      });

      if (freePackage) {
        this.packageConditions = this.packageConditions || {};
        this.packageConditions.basic = {
          maxCatalogs: freePackage.conditions.maxCatalogs,
          maxProductsPerCatalog: freePackage.conditions.maxProductsPerCatalog,
        };
        // Don't touch current if it exists
        if (!this.packageConditions.current) {
          this.packageConditions.current = null;
        }
      }
    } catch (err) {
      console.error("Error setting package conditions:", err);
    }
  }
  next();
});

// Password comparison method
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Add indexes
userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ role: 1 });

module.exports = mongoose.model("User", userSchema);
