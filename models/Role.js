const mongoose = require("mongoose");

const permissionSchema = new mongoose.Schema({
  moduleId: { type: String, required: false },
  name: { type: String, required: false },
  enabled: { type: Boolean, default: false },
  permissions: { type: [String], default: [] },
});

const roleSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  enabled: { type: Boolean, default: true },
  moduleAccess: [permissionSchema],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Role", roleSchema);
