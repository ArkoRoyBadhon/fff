const mongoose = require("mongoose");

const permissionSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      enum: ["Read", "Write", "Delete", "Manage"],
      default: "Read",
    },
    description: {
      type: String,
      required: false,
    },
  },
  { _id: false }
);

const moduleSchema = new mongoose.Schema({
  moduleId: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
  },
  name: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    required: false,
    trim: true,
  },
  icon: {
    type: String,
    default: "box",
  },
  enabled: {
    type: Boolean,
    default: true,
  },
  isSystemModule: {
    type: Boolean,
    default: false,
  },
  permissions: [permissionSchema],
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

moduleSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

moduleSchema.index({ name: "text", description: "text" });

module.exports = mongoose.model("ModuleModel", moduleSchema);
