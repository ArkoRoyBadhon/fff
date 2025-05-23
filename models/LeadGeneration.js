const mongoose = require("mongoose");

const leadGenerationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  firstName: {
    type: String,
    required: true,
    trim: true,
  },
  lastName: {
    type: String,
    required: true,
    trim: true,
  },
  organization: {
    type: String,
    required: true,
    trim: true,
  },
  contactNumber: {
    type: String,
    required: true,
    trim: true,
  },
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
  },
  sector: {
    type: String,
    required: true,
  },
  interests: {
    type: [String],
    required: true,
  },
  needsDescription: {
    type: String,
    trim: true,
  },
  joinKingMansa: {
    type: String,
    required: true,
    enum: ["yes", "no"],
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("LeadGeneration", leadGenerationSchema);