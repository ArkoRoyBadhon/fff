const express = require("express");
const router = express.Router();
const {
  getAllOrders,
  getOrderById,
  getOrderCustomer,
  updateOrder,
  deleteOrder,
  getDashboardOrders,
  getDashboardRecentOrder,
  getBestSellerProductChart,
  getDashboardCount,
  getDashboardAmount,
  getAllOrderRequestSupplier,
  updateOrderAdmin,
} = require("../controller/orderController");
const { protect } = require("../middleware/authMiddleware");
const { isAdmin } = require("../middleware/adminMiddleware");

//get all orders
router.get("/", getAllOrders);

// get dashboard orders data
router.get("/dashboard", getDashboardOrders);

// dashboard recent-order
router.get("/dashboard-recent-order", getDashboardRecentOrder);

// dashboard order count
router.get("/dashboard-count", getDashboardCount);

// dashboard order amount
router.get("/dashboard-amount", getDashboardAmount);

// chart data for product
router.get("/best-seller/chart", getBestSellerProductChart);

// arko
router.get("/all-order-request-supplier", protect, getAllOrderRequestSupplier);

//get all order by a user
router.get("/customer/:id", getOrderCustomer);

//get a order by id
router.get("/:id", getOrderById);

//update a order
router.patch("/update/:id", protect, updateOrder);
router.patch("/update/:id/admin", isAdmin, updateOrderAdmin);

//delete a order
router.delete("/:id", deleteOrder);

module.exports = router;
