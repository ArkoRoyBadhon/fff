const express = require("express");
const router = express.Router();
const {
  addOrder,
  getOrderById,
  getOrderCustomer,
  sendEmailInvoiceToCustomer,
  getOrderAdmin,
  BuyerDashboardStats,
  getOrderSeller,
  getOrderSellerAdmin,
} = require("../controller/customerOrderController");

const { emailVerificationLimit } = require("../lib/email-sender/sender");
const { protect } = require("../middleware/authMiddleware");
const { isAdmin } = require("../middleware/adminMiddleware");

//add a order
router.post("/add", protect, addOrder);
router.get("/dashboard-stats", protect, BuyerDashboardStats);
router.get("/get-order-seller", protect, getOrderSeller);

router.get("/get-order-seller-admin", isAdmin, getOrderSellerAdmin);

// order admin
router.get("/admin-order", isAdmin, getOrderAdmin);

//get a order by id
router.get("/:id", protect, getOrderById);
router.get("/:id/admin", isAdmin, getOrderById);

//get all order by a user
router.get("/", protect, getOrderCustomer);

//#send email invoice to customer
router.post(
  "/customer/invoice",
  emailVerificationLimit,
  sendEmailInvoiceToCustomer
);

module.exports = router;
