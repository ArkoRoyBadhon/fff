const mongoose = require("mongoose");
const { Schema } = mongoose;

// Pricing configuration (could also be moved to a separate config file)
const PRICING = {
  media: {
    image: 5, // $5 per image
    video: 10, // $10 per video
  },
  duration: {
    3: 15, // $15 for 3 days
    7: 25, // $25 for 7 days
    10: 35,
    15: 45,
    21: 60,
    30: 80,
  },
  adType: {
    search: 0, // no additional cost
    landing: 15, // $15 extra for landing page ads
    other: 10, // $10 extra for other pages
  },
  category: {
    base: 5, // $5 for first category
    additional: 2, // $2 for each additional category
  },
};

const advertisementSchema = new Schema(
  {
    title: {
      type: String,
      required: [true, "Advertisement title is required"],
      trim: true,
      maxlength: [100, "Title cannot exceed 100 characters"],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, "Description cannot exceed 500 characters"],
    },
    targetKeywords: [
      {
        type: String,
        trim: true,
        lowercase: true,
      },
    ],
    categories: [
      {
        type: Schema.Types.ObjectId,
        ref: "Category",
        required: [true, "At least one category is required"],
      },
    ],
    duration: {
      type: Number,
      required: true,
      enum: [3, 7, 10, 15, 21, 30],
      default: 7,
    },
    adType: {
      type: String,
      required: true,
      enum: ["search", "landing", "other"],
      default: "search",
    },
    media: [
      {
        url: {
          type: String,
          required: true,
        },
        mediaType: {
          type: String,
          enum: ["image", "video"],
          required: true,
        },
        publicId: String,
      },
    ],
    status: {
      type: String,
      enum: ["Draft", "Pending", "Active", "Paused", "Completed", "Rejected"],
      default: "Draft",
    },
    startDate: {
      type: Date,
      default: null,
    },
    endDate: {
      type: Date,
      default: null,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    impressions: {
      type: Number,
      default: 0,
    },
    clicks: {
      type: Number,
      default: 0,
    },
    ctr: {
      type: Number,
      default: 0,
    },
    budget: {
      type: Number,
      default: 0,
    },
    spent: {
      type: Number,
      default: 0,
    },
    pricingBreakdown: {
      mediaCost: { type: Number, default: 0 },
      durationCost: { type: Number, default: 0 },
      adTypeCost: { type: Number, default: 0 },
      categoryCost: { type: Number, default: 0 },
      totalCost: { type: Number, default: 0 },
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Calculate pricing before saving
advertisementSchema.pre("save", function (next) {
  if (
    this.isModified("status") &&
    this.status === "active" &&
    !this.startDate
  ) {
    this.startDate = new Date();
    this.endDate = new Date(
      new Date().setDate(this.startDate.getDate() + this.duration)
    );
  }

  // Calculate pricing whenever relevant fields change
  if (
    this.isModified("media") ||
    this.isModified("duration") ||
    this.isModified("adType") ||
    this.isModified("categories")
  ) {
    this.calculatePricing();
  }

  // Set budget to total cost if not explicitly set
  if (this.budget === 0) {
    this.budget = this.pricingBreakdown.totalCost;
  }

  next();
});

// Method to calculate pricing
advertisementSchema.methods.calculatePricing = function () {
  // Calculate media cost
  const mediaCost = this.media.reduce((total, item) => {
    return total + PRICING.media[item.mediaType];
  }, 0);

  // Calculate duration cost
  const durationCost = PRICING.duration[this.duration] || 0;

  // Calculate ad type cost
  const adTypeCost = PRICING.adType[this.adType] || 0;

  // Calculate category cost
  const categoryCount = this.categories.length;
  const categoryCost =
    categoryCount > 0
      ? PRICING.category.base +
        (categoryCount - 1) * PRICING.category.additional
      : 0;

  // Calculate total cost
  const totalCost = mediaCost + durationCost + adTypeCost + categoryCost;

  // Update pricing breakdown
  this.pricingBreakdown = {
    mediaCost,
    durationCost,
    adTypeCost,
    categoryCost,
    totalCost,
  };

  return this.pricingBreakdown;
};

advertisementSchema.methods.calculateCTR = function () {
  this.ctr = this.impressions > 0 ? (this.clicks / this.impressions) * 100 : 0;
  return this.ctr;
};

const Advertisement = mongoose.model("Advertisement", advertisementSchema);

module.exports = Advertisement;
