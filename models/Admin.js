const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const { UserDefinedMessageInstance } = require("twilio/lib/rest/api/v2010/account/call/userDefinedMessage");

const adminSchema = new mongoose.Schema({
  name: {
    en: { type: String, required: true },
  },
  image: { type: String },
  username: { type: String, required: true, unique: true },
  isActive: { type: Boolean, default: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true, select: false },
  phone: { type: String },
  role: { type: String, enum: ["admin", "super admin"], required: true },
  joiningData: { type: Date, default: Date.now },
  access_list: [{ type: String }],
});

adminSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

adminSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model("Admin", adminSchema);
