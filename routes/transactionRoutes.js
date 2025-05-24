const express = require("express");
const {
  createTransaction,
  getTransactionsByUser,
} = require("../controller/Transactions");
const { protect } = require("../middleware/authMiddleware");
const router = express.Router();

router.post("/create", protect, createTransaction);

router.get("/user/:userId", protect, getTransactionsByUser);

module.exports = router;
