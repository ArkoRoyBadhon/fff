const Inquiry = require("../models/Inquiry");

const User = require("../models/User");
// const { userSocketMap, getSocketIoId } = require("../api/socketHelper");
const Order = require("../models/Order");
const { io, userSocketMap } = require("../api");
// const { io } = require("../api");

const createInquiry = async (req, res) => {
  try {
    const { productId, buyerId, sellerId, messages } = req.body;

    if (!productId || !buyerId || !sellerId) {
      return res.status(400).json({
        message: "productId, buyerId, and sellerId are required fields",
      });
    }

    const existingInquiry = await Inquiry.findOne({
      productId,
      buyerId,
      "messages.inquiry": true,
    });

    if (existingInquiry) {
      return res.status(200).json({
        message: "Inquiry already exists",
        inquiry: existingInquiry,
        isExist: true,
      });
    }

    const existingChat = await Inquiry.findOne({
      productId,
      buyerId,
    });

    if (!existingChat) {
      const newInquiry = new Inquiry({
        ...req.body,
        messages: messages || [
          {
            senderId: buyerId,
            senderType: "buyer",
            text: "Inquiry about this product",
            inquiry: true,
            ...(req.body.quantity && { quantity: req.body.quantity }),
          },
        ],
      });

      const savedInquiry = await newInquiry.save();
      return res.status(201).json(savedInquiry);
    }

    const updatedInquiry = await Inquiry.findByIdAndUpdate(
      existingChat._id,
      {
        $push: {
          messages: {
            senderId: buyerId,
            senderType: "buyer",
            text: messages?.[0]?.text || "Inquiry about this product",
            inquiry: true,
            ...(messages?.[0]?.quantity && { quantity: messages[0].quantity }),
            createdAt: new Date(),
          },
        },
        $set: { isClosed: false },
      },
      { new: true }
    );

    const users = await User.find({
      $or: [{ _id: updatedInquiry.buyerId }, { _id: updatedInquiry.sellerId }],
    });

    users.forEach((userdata) => {
      const userSocket = userSocketMap.find(
        (entry) => entry.userId === userdata?._id.toString()
      );
      const socketId = userSocket?.socketId;

      // const io = req.app.get("io");

      if (socketId) {
        console.log(
          `Emitting message to user ${updatedInquiry.buyerId} on socket ${socketId}`
        );
        io.to(socketId).emit("new_message", {
          inquiryId: updatedInquiry._id,
          message: updatedInquiry.messages[updatedInquiry.messages.length - 1],
        });
      } else {
        console.log(`User ${updatedInquiry.buyerId} is not connected`);
      }
    });

    return res.status(201).json(updatedInquiry);
  } catch (error) {
    console.error("Error in createInquiry:", error);

    if (error.name === "ValidationError") {
      return res.status(400).json({
        message: "Validation error",
        errors: error.errors,
      });
    }

    res.status(500).json({
      message: "Error creating inquiry",
      error: error.message,
    });
  }
};

const addMessage = async (req, res) => {
  try {
    const { inquiryId } = req.params;
    const { senderId, senderType, text } = req.body;

    if (!inquiryId || !senderId || !senderType || !text) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    if (!["buyer", "seller"].includes(senderType)) {
      return res.status(400).json({ message: "Invalid sender type" });
    }

    if (typeof text !== "string" || text.trim().length === 0) {
      return res.status(400).json({ message: "Message text cannot be empty" });
    }

    const updatedInquiry = await Inquiry.findByIdAndUpdate(
      inquiryId,
      {
        $push: {
          messages: {
            senderId,
            senderType,
            text: text.trim(),
            createdAt: new Date(),
          },
        },
        $set: { updatedAt: new Date() },
      },
      {
        new: true,
        runValidators: true,
      }
    ).lean();

    if (!updatedInquiry) {
      return res.status(404).json({ message: "Inquiry not found" });
    }

    const users = await User.find({
      $or: [{ _id: updatedInquiry.buyerId }, { _id: updatedInquiry.sellerId }],
    });

    users.forEach((userdata) => {
      const userSocket = userSocketMap.find(
        (entry) => entry.userId === userdata?._id.toString()
      );
      const socketId = userSocket?.socketId;

      // const io = req.app.get("io");

      if (socketId) {
        console.log(
          `Emitting message to user ${updatedInquiry.buyerId} on socket ${socketId}`
        );
        io.to(socketId).emit("new_message", {
          inquiryId: updatedInquiry._id,
          message: updatedInquiry.messages[updatedInquiry.messages.length - 1],
        });
      } else {
        console.log(`User ${updatedInquiry.buyerId} is not connected`);
      }
    });

    res.json({
      success: true,
      data: updatedInquiry,
    });
  } catch (error) {
    console.error("Error adding message:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

const getBuyerInquiries = async (req, res) => {
  try {
    const { buyerId } = req.params;
    const inquiries = await Inquiry.find({ buyerId })
      .populate("buyerId")
      .populate("sellerId")
      .populate("productId")
      .populate("rfqId")
      .populate("quoteId")
      .sort({ updatedAt: -1 });

    res.json(inquiries);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error fetching inquiries", error: error.message });
  }
};

const getSellerInquiries = async (req, res) => {
  try {
    const { sellerId } = req.params;
    console.log("sellerId", sellerId);

    const inquiries = await Inquiry.find({ sellerId })
      .populate("buyerId")
      .populate("sellerId")
      .populate("productId")
      .populate("rfqId")
      .populate("quoteId")
      .sort({ updatedAt: -1 });

    res.json(inquiries);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error fetching inquiries", error: error.message });
  }
};

const getInquiry = async (req, res) => {
  try {
    const { inquiryId } = req.params;

    // Fetch the inquiry
    const inquiry = await Inquiry.findById(inquiryId)
      .populate("buyerId")
      .populate("productId")
      .populate("sellerId")
      .populate("rfqId")
      .populate("quoteId");

    if (!inquiry) {
      return res.status(404).json({ message: "Inquiry not found" });
    }

    // Check the role of the visiting user
    const userRole = req.user?.role[0];

    if (!userRole) {
      return res.status(403).json({ message: "Unauthorized access" });
    }

    // Update the messages to mark them as read for the appropriate sender type
    const senderTypeToMark = userRole === "buyer" ? "seller" : "buyer";

    const updatedInquiry = await Inquiry.findOneAndUpdate(
      { _id: inquiryId },
      {
        $set: {
          "messages.$[msg].isRead": true,
        },
      },
      {
        arrayFilters: [
          { "msg.isRead": false, "msg.senderType": senderTypeToMark },
        ],
        new: true,
      }
    )
      .populate("buyerId")
      .populate("productId")
      .populate("sellerId")
      .populate("rfqId")
      .populate("quoteId");

    const existsOrder = await Order.findOne({
      inquiry: inquiryId,
      status: {
        $in: ["Pending", "Processing", "Delivered", "Shipped", "Not_Confirm"],
      },
    });

    res.json({ inquiry: updatedInquiry, order: existsOrder });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error fetching inquiry", error: error.message });
  }
};

const getChatBySeller = async (req, res) => {
  try {
    const { sellerId } = req.params;
    const { buyerId, productId, rfqId, quoteId } = req.body;

    let inquiry = await Inquiry.findOne({ sellerId, buyerId, productId })
      .populate("buyerId")
      .populate("productId")
      .populate("sellerId")
      .populate("rfqId")
      .populate("quoteId");

    if (!inquiry) {
      if (!buyerId) {
        return res.status(400).json({
          message: "buyerId is required to create a new inquiry",
        });
      }

      if (productId) {
        inquiry = new Inquiry({
          sellerId,
          buyerId,
          productId,
          messages: [],
          isClosed: false,
        });
      } else {
        inquiry = new Inquiry({
          sellerId,
          buyerId,
          rfqId,
          quoteId,
          messages: [
            {
              senderId: buyerId,
              senderType: "buyer",
              text: "Hello, I'm interested in your product. Can you provide more details?",
              isQuatation: true,
              isRead: false,
              createdAt: new Date(),
            },
          ],
          isClosed: false,
        });
      }

      await inquiry.save();

      inquiry = await Inquiry.findById(inquiry._id)
        .populate("buyerId")
        .populate("productId")
        .populate("rfqId")
        .populate("quoteId")
        .populate("sellerId");
    }

    res.json(inquiry);
  } catch (error) {
    res.status(500).json({
      message: "Error fetching or creating inquiry",
      error: error.message,
    });
  }
};

const closeInquiry = async (req, res) => {
  try {
    const { inquiryId } = req.params;
    const updatedInquiry = await Inquiry.findByIdAndUpdate(
      inquiryId,
      { isClosed: true },
      { new: true }
    );

    if (!updatedInquiry) {
      return res.status(404).json({ message: "Inquiry not found" });
    }

    res.json(updatedInquiry);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error closing inquiry", error: error.message });
  }
};

module.exports = {
  createInquiry,
  addMessage,
  getBuyerInquiries,
  getSellerInquiries,
  getInquiry,
  closeInquiry,
  getChatBySeller,
};
