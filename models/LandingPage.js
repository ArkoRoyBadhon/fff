// models/LandingPage.model.js
const mongoose = require("mongoose");

const sectionSchema = new mongoose.Schema({
  sectionType: {
    type: String,
    required: true,
    enum: [
      "hero",
      "join",
      "howWork",
      "import",
      "discover",
      "expandMarket",
      "contact",
      "partners",
      "footer",
    ],
    unique: true,
  },
  data: {
    type: mongoose.Schema.Types.Mixed,
    required: true,
  },
});

module.exports = mongoose.model("LandingPage", sectionSchema);
