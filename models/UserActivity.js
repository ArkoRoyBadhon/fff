const { Schema, model } = require("mongoose");

const UserActivitySchema = new Schema(
  {
    ipAddress: {
      type: String,
      required: true,
      index: true,
    },
    searches: [
      {
        searchString: { type: String, required: true },
        count: { type: Number, default: 1 },
      },
    ],
    categoryClicks: [
      {
        categoryName: {
          type: Schema.Types.ObjectId,
          ref: "Category",
          required: true,
        },
        clickCount: { type: Number, default: 0 },
      },
    ],
  },
  { timestamps: true }
);

module.exports = model("UserActivity", UserActivitySchema);
