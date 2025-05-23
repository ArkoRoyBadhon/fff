require("dotenv").config();
const { connectDB } = require("../config/db");
const { createServer } = require("http");
const { Server } = require("socket.io");
const app = require("./app");
const User = require("../models/User");
// const { userSocketMap } = require("./socketHelper");

// Initialize DB connection
connectDB();

// Create server instances
const httpServer = createServer(app);
const io = new Server(httpServer);

const userSocketMap = [];
// app.set("io", io);

// Socket.io logic
io.on("connection", async (socket) => {
  try {
    const userId = socket.handshake.query.userId;
    console.log("User ID:", userId);

    if (userId) {
      await User.findByIdAndUpdate(userId, { isActive: true }).exec();
    }

    const socketId = socket.id;
    console.log("Socket connected:", socketId);

    const existingUserIndex = userSocketMap.findIndex(
      (entry) => entry.userId === userId
    );

    if (existingUserIndex !== -1) {
      userSocketMap[existingUserIndex].socketId = socketId;
    } else {
      userSocketMap.push({ userId, socketId });
    }

    io.emit(
      "active_users",
      userSocketMap.map((entry) => entry.userId)
    );

    socket.on("disconnect", async () => {
      if (userId) {
        await User.findByIdAndUpdate(userId, { isActive: false }).exec();
        const userIndex = userSocketMap.findIndex(
          (entry) => entry.userId === userId
        );
        if (userIndex !== -1) {
          userSocketMap.splice(userIndex, 1);
        }
      }
    });
  } catch (error) {
    console.error("Socket connection error:", error);
  }
});

module.exports = { io, httpServer, userSocketMap };
// Routes
// app.use("/api/auth", require("../routes/authRoutes"));
app.use("/api/products", require("../routes/productRoutes"));
app.use("/api/categories", require("../routes/categoryRoutes"));
app.use("/api/inquiry", require("../routes/inquiryRoute"));
app.use("/api/order-user", require("../routes/customerOrderRoutes"));
app.use("/api/order", require("../routes/orderRoutes"));
app.use("/api/images", require("../routes/ImageRoute"));
app.use("/api/reviews", require("../routes/reviewRoute"));
app.use("/api/modifications", require("../routes/modificationRoutes"));
app.use("/api/auth", require("../routes/authRoutes"));
app.use("/api/admin", require("../routes/admin"));
app.use("/api/subscriptions", require("../routes/subscriptionRoutes"));
app.use("/api/disputes", require("../routes/disputeRoute"));
app.use("/api/transactions", require("../routes/transactionRoutes"));
app.use("/api/store", require("../routes/storeSetupRoutes"));
app.use("/api/catalog", require("../routes/catalogRoutes"));
app.use("/api/notifications", require("../routes/notificationRoutes"));
app.use("/api/leads", require("../routes/leadGenerationRoutes"));

// Start the server
const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Export the server instance for Vercel
