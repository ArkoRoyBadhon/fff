const express = require("express");
const {
  createTransaction,
  getTransactionsByUser,
} = require("../controller/TransactionsController");
const { protect } = require("../middleware/authMiddleware");
const {
  getTransactionsBySeller,
} = require("../controller/TransactionsController");
const router = express.Router();

router.post("/create", protect, createTransaction);

router.get("/user/:userId", protect, getTransactionsByUser);
router.get("/seller/:userId", protect, getTransactionsBySeller);

module.exports = router;
