const mongoose = require("mongoose");

const settingSchema = new mongoose.Schema({
  type: {
    type: String,
    required: true,
    enum: ["general", "social-media", "seo", "social-login"],
  },
  data: {
    type: mongoose.Schema.Types.Mixed,
    required: true,
  },
  lastUpdated: {
    type: Date,
    default: Date.now,
  },
});

settingSchema.index({ type: 1 }, { unique: true });

module.exports = mongoose.model("Setting", settingSchema);
