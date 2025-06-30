const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const customAccessSchema = new mongoose.Schema({
  moduleId: { type: String, required: true },
  name: { type: String, required: false },
  enabled: { type: Boolean, default: false },
  permissions: { type: [String], default: [] },
});

const employeeSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: {
    type: String,
    required: true,
    unique: true,
    match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  },
  roleId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Role",
    required: true,
  },
  enabled: { type: Boolean, default: true },
  customAccess: [customAccessSchema],
  password: { type: String, required: true, select: false },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

employeeSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

employeeSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model("Employee", employeeSchema);
