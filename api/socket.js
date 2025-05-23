// // server.js
// require("dotenv").config();
// const { connectDB } = require("../config/db");
// const { createServer } = require("http");
// const { Server } = require("socket.io");
// const app = require("./app");
// const User = require("../models/User");
// const { userSocketMap } = require("./test");

// // Initialize everything in proper order
// connectDB();

// const httpServer = createServer(app);
// const io = new Server(httpServer);

// // Socket.io logic
// io.on("connection", async (socket) => {
//   try {
//     const userId = socket.handshake.query.userId;
//     console.log("User ID:", userId);

//     if (userId) {
//       await User.findByIdAndUpdate(userId, { isActive: true }).exec();
//     }

//     const socketId = socket.id;
//     console.log("Socket connected:", socketId);

//     const existingUserIndex = userSocketMap.findIndex(
//       (entry) => entry.userId === userId
//     );

//     if (existingUserIndex !== -1) {
//       userSocketMap[existingUserIndex].socketId = socketId;
//     } else {
//       userSocketMap.push({ userId, socketId });
//     }

//     socket.on("disconnect", async () => {
//       if (userId) {
//         await User.findByIdAndUpdate(userId, { isActive: false }).exec();
//         const userIndex = userSocketMap.findIndex(
//           (entry) => entry.userId === userId
//         );
//         if (userIndex !== -1) {
//           userSocketMap.splice(userIndex, 1);
//         }
//       }
//     });
//   } catch (error) {
//     console.error("Socket connection error:", error);
//   }
// });

// const PORT = process.env.PORT || 5055;
// httpServer.listen(PORT, () => console.log(`Server running on port ${PORT}`));

// // Export for testing or other uses
// module.exports = { io, httpServer };
