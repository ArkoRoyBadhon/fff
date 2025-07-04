const express = require("express");
const router = express.Router();
const {
  addProduct,
  addAllProducts,
  getAllProducts,
  getShowingProducts,
  getProductById,
  getProductBySlug,
  updateProduct,
  updateManyProducts,
  updateStatus,
  deleteProduct,
  deleteManyProducts,
  getShowingStoreProducts,
  getShowingProductsforCatalog,
  getStoreProducts,
  getAllProductsAdmin,
  YearlyProductController,
} = require("../controller/productController");
const { protect } = require("../middleware/authMiddleware");
const { isAdmin } = require("../middleware/adminMiddleware");

//add a product
// router.post("/add", protect, addProduct);
router.post("/add", protect, addProduct);

//add multiple products
router.post("/all", addAllProducts);

//get a product
router.post("/:id", getProductById);

//get showing products only
router.get("/show", getShowingProducts);
router.get("/show-by-catalog", getShowingProductsforCatalog);

//get showing products in store
router.get("/store", protect, getShowingStoreProducts);
router.get("/store-products/:id", getStoreProducts);

//get all products
router.get("/", getAllProducts);
router.get("/admin", getAllProductsAdmin);
router.get("/time-product", YearlyProductController);

//get a product by slug
router.get("/product-by-slug/:slug", getProductBySlug);

//update a product
router.patch("/:id", protect, updateProduct);

//update many products
router.patch("/update/many", updateManyProducts);

//update a product status
router.patch("/status/:id", isAdmin, updateStatus);

//delete a product
router.delete("/:id", deleteProduct);

//delete many product
router.patch("/delete/many", deleteManyProducts);

module.exports = router;
