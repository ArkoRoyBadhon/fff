const mongoose = require("mongoose");
const { ref } = require("pdfkit");
const Schema = mongoose.Schema;

const messageSchema = new Schema({
  senderId: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  senderType: {
    type: String,
    ref: "User",
    required: true,
    enum: ["buyer", "seller"],
  },
  text: {
    type: String,
    required: true,
  },
  inquiry: {
    type: Boolean,
    default: false,
  },
  isQuatation: {
    type: Boolean,
    default: false,
  },
  quantity: {
    type: Number,
    require: false,
  },
  isRead: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const inquirySchema = new Schema(
  {
    productId: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      required: false,
    },
    rfqId: {
      type: Schema.Types.ObjectId,
      ref: "RFQ",
      required: false,
    },
    quoteId: {
      type: Schema.Types.ObjectId,
      ref: "Quotation",
      required: false,
    },
    buyerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    sellerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    messages: [messageSchema],
    isClosed: {
      type: Boolean,
      default: false,
    },

    extra: {
      type: Object,
      required: false,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Inquiry", inquirySchema);
