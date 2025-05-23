// test.js

const userSocketMap = [];

const getSocketIoId = (userId) => {
  if (!Array.isArray(userSocketMap)) {
    throw new Error("Invalid userSocketMap. Ensure it's an array.");
  }
  return (
    userSocketMap.find((entry) => entry.userId === userId)?.socketId || null
  );
};

module.exports = {
  // userSocketMap,
  // getSocketIoId,
};
