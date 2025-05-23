const mongoose = require("mongoose");
const AutoIncrement = require("mongoose-sequence")(mongoose);

const paymentMilestoneSchema = new mongoose.Schema({
  percentage: { type: Number, required: true, min: 0, max: 100 },
  days: { type: Number, required: true, min: 0 },
});

const orderSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    buyerConfirm: {
      type: Boolean,
      default: false,
    },
    sellerConfirm: {
      type: Boolean,
      default: false,
    },
    modifications: [
      {
        requestedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        requestedAt: {
          type: Date,
          default: Date.now,
        },
        quantity: {
          type: Number,
          min: 1,
          validate: {
            validator: Number.isInteger,
            message: "{VALUE} is not an integer value for quantity",
          },
        },
        color: {
          type: String,
          required: false,
        },
        material: {
          type: String,
          required: false,
        },
        additionalNote: {
          type: String,
          required: false,
        },
        price: {
          type: Number,
          required: false,
        },
        total: {
          type: Number,
          required: false,
        },
        status: {
          type: String,
          enum: ["Pending", "Approved", "Rejected"],
          default: "Pending",
        },
        respondedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        respondedAt: {
          type: Date,
        },
        responseNote: {
          type: String,
          maxlength: 500,
        },
      },
    ],
    paymentTerms: {
      upfront: { type: Number, min: 0, max: 100 },
      onDelivery: { type: Number, min: 0, max: 100 },
      milestones: [paymentMilestoneSchema],
    },
    inquiry: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Inquiry",
      required: false,
    },
    invoice: {
      type: Number,
      required: false,
    },
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    seller: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
    },
    color: {
      type: String,
      required: false,
    },
    material: {
      type: String,
      required: false,
    },
    additionalNote: {
      type: String,
      required: false,
    },
    price: {
      type: Number,
      required: false,
    },
    total: {
      type: Number,
      required: false,
    },
    shippingAddress: {
      type: String,
      required: true,
    },
    shippingMethod: {
      type: String,
      required: true,
    },

    upfrontAmount: {
      type: Number,
      required: false,
    },
    postDeliveryAmount: {
      type: Number,
      required: false,
    },
    paymentMethod: {
      type: String,
      default: "OnPlatform",
      enum: ["OnPlatform", "OffPlatform"],
    },
    payStatus: {
      type: String,
      default: "Pending",
      enum: ["Pending", "Upfront", "Paid"],
    },
    isAgreeTerm: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: [
        "Not_Confirm",
        "Pending",
        "Processing", // dispatch
        "Shipped", // shipped to sender port
        "Delivered", // delivered
        "Cancelled",
        "Return",
        "Completed",
      ],
      default: "Not_Confirm",
    },
    cancelNote: {
      type: String,
      default: "",
    },
    depositDate: {
      type: Date,
    },
    deliverTime: {
      type: Date,
    },
    deliveredAt: {
      type: Date,
    },
    dispatchDocuments: {
      type: [String],
    },
    deliveryProof: {
      type: [String],
    },
    isVerified: {
      type: Boolean,
      default: false, // admin action for fund verification
    },
    isDispatch: {
      type: Boolean,
      default: false, // admin action for dispatch verification
    },
    fundsReleased: {
      type: Boolean,
      default: false, // admin action to seller
    },
    fundsReleasedAt: {
      type: Date,
    },

    returnProofUrls: {
      type: [String],
    },
    returnReason: {
      type: String,
      default: "",
    },
    returnRequested: {
      type: Boolean,
      default: false,
    },
    returnRequestedAt: {
      type: Date,
    },
    returnCompletedAt: {
      type: Date,
    },
    returnStatus: {
      type: String,
      default: "Not",
      enum: ["Pending", "Approved", "Rejected", "Not"],
    },

    // dispute related field
    disputes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Dispute",
      },
    ],
    isDisputeActive: {
      type: Boolean,
      default: false,
    },
    disputePausedActions: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

const Order = mongoose.model(
  "Order",
  orderSchema.plugin(AutoIncrement, {
    inc_field: "invoice",
    start_seq: 10000,
  })
);
module.exports = Order;
