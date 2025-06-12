const mongoose = require("mongoose");
const { Schema } = mongoose;

// Pricing configuration
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

// Metric schema for time-based tracking
const metricSchema = new Schema({
  date: {
    type: Date,
    required: true,
    default: Date.now,
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
});

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
    product: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      required: true,
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
    approveDate: {
      type: Date,
      default: null,
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
    dailyMetrics: [metricSchema],
    monthlyMetrics: [metricSchema],
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
    this.status === "Active" &&
    !this.startDate
  ) {
    this.startDate = new Date();
    this.endDate = new Date(
      new Date().setDate(this.startDate.getDate() + this.duration)
    );
  }

  if (
    this.isModified("status") &&
    this.status === "Active" &&
    !this.approveDate
  ) {
    this.approveDate = new Date();
  }

  if (
    this.isModified("media") ||
    this.isModified("duration") ||
    this.isModified("adType") ||
    this.isModified("categories")
  ) {
    this.calculatePricing();
  }

  if (this.budget === 0) {
    this.budget = this.pricingBreakdown.totalCost;
  }

  next();
});

advertisementSchema.methods.checkValidity = async function () {
  if (this.approveDate) {
    const validityEndDate = new Date(
      this.approveDate.getTime() + this.duration * 24 * 60 * 60 * 1000
    );
    if (new Date() > validityEndDate) {
      this.status = "Paused";
      await this.save();
    }
  }
};

// Method to calculate pricing
advertisementSchema.methods.calculatePricing = function () {
  const mediaCost = this.media.reduce((total, item) => {
    return total + PRICING.media[item.mediaType];
  }, 0);

  const durationCost = PRICING.duration[this.duration] || 0;
  const adTypeCost = PRICING.adType[this.adType] || 0;

  const categoryCount = this.categories.length;
  const categoryCost =
    categoryCount > 0
      ? PRICING.category.base +
        (categoryCount - 1) * PRICING.category.additional
      : 0;

  const totalCost = mediaCost + durationCost + adTypeCost + categoryCost;

  this.pricingBreakdown = {
    mediaCost,
    durationCost,
    adTypeCost,
    categoryCost,
    totalCost,
  };

  return this.pricingBreakdown;
};

// Method to record an impression
advertisementSchema.methods.recordImpression = function () {
  const now = new Date();
  this.impressions += 1;
  this.updateTimeBasedMetric("dailyMetrics", now);
  this.updateTimeBasedMetric("monthlyMetrics", now, true);
  this.calculateCTR();
};

// Method to record a click
advertisementSchema.methods.recordClick = function () {
  const now = new Date();
  this.clicks += 1;
  this.updateTimeBasedMetric("dailyMetrics", now, false, true);
  this.updateTimeBasedMetric("monthlyMetrics", now, true, true);
  this.calculateCTR();
};

// Method to update time-based metrics
advertisementSchema.methods.updateTimeBasedMetric = function (
  metricType,
  date,
  isMonthly = false,
  isClick = false
) {
  let keyDate = new Date(date);

  if (isMonthly) {
    keyDate = new Date(keyDate.getFullYear(), keyDate.getMonth(), 1);
  } else {
    keyDate.setHours(0, 0, 0, 0);
  }

  let metricRecord = this[metricType].find(
    (m) => m.date.getTime() === keyDate.getTime()
  );

  if (!metricRecord) {
    metricRecord = { date: keyDate, impressions: 0, clicks: 0, ctr: 0 };
    this[metricType].push(metricRecord);
  }

  if (isClick) {
    metricRecord.clicks += 1;
  } else {
    metricRecord.impressions += 1;
  }

  metricRecord.ctr =
    metricRecord.impressions > 0
      ? (metricRecord.clicks / metricRecord.impressions) * 100
      : 0;
};

// Method to calculate overall CTR
advertisementSchema.methods.calculateCTR = function () {
  this.ctr = this.impressions > 0 ? (this.clicks / this.impressions) * 100 : 0;
};

const Advertisement = mongoose.model("Advertisement", advertisementSchema);

module.exports = Advertisement;
