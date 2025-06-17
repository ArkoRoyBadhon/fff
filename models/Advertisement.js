const mongoose = require("mongoose");
const { Schema } = mongoose;

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
    targetCountries: [
      {
        type: String,
        trim: true,
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

  next();
});

advertisementSchema.methods.checkValidity = async function () {
  if (this.approveDate) {
    // Calculate validity end date in UTC
    const validityEndDate = new Date(
      this.approveDate.getTime() + this.duration * 24 * 60 * 60 * 1000
    );

    // Get the current date in UTC
    const currentDate = new Date();

    console.log("approveDate:", this.approveDate.toISOString());
    console.log("validityEndDate:", validityEndDate.toISOString());
    console.log("currentDate:", currentDate.toISOString());

    // Compare dates
    if (currentDate > validityEndDate) {
      console.log("Ad is now paused due to expiration.");
      this.status = "Paused";
      await this.save();
    }
  }
};

advertisementSchema.add({
  pricePerImpression: {
    type: Number,
    required: true,
    default: 0.01, // Example: $0.01 per impression
  },
});

// Method to record an impression
advertisementSchema.methods.recordImpression = async function () {
  const now = new Date();

  // Check if the budget allows recording another impression
  const remainingBudget = this.budget - this.spent;
  if (remainingBudget >= this.pricePerImpression) {
    // Increment the impressions count and update metrics
    this.impressions += 1;
    this.spent += this.pricePerImpression;

    this.updateTimeBasedMetric("dailyMetrics", now);
    this.updateTimeBasedMetric("monthlyMetrics", now, true);

    // Recalculate the CTR
    this.calculateCTR();

    // Check if the spent budget equals or exceeds the total budget
    if (this.spent >= this.budget) {
      this.status = "Paused"; // Pause the ad if budget is spent
    }

    // Save the changes
    await this.save();
  } else {
    // Pause the ad if budget is insufficient
    this.status = "Paused";
    await this.save();
  }
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
