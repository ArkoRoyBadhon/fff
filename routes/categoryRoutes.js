const express = require("express");
const {
  createCategory,
  createSubCategory,
  createSubSubCategory,
  updateCategory,
  updateSubCategory,
  updateSubSubCategory,
  deleteCategory,
  deleteSubCategory,
  deleteSubSubCategory,
  getCategories,
  getDemandedCategories,
} = require("../controller/categoryController");
const { isAdmin } = require("../middleware/adminMiddleware");
const router = express.Router();

// Create routes
router.post("/", isAdmin, createCategory);
router.post("/:categoryId/subcategories", isAdmin, createSubCategory);
router.post(
  "/:categoryId/subcategories/:subCategoryId/subsubcategories",
  isAdmin,
  createSubSubCategory
);

// Update routes
router.put("/:categoryId", isAdmin, updateCategory);
router.put(
  "/:categoryId/subcategories/:subCategoryId",
  isAdmin,
  updateSubCategory
);
router.put(
  "/:categoryId/subcategories/:subCategoryId/subsubcategories/:subSubCategoryId",
  isAdmin,
  updateSubSubCategory
);

// Delete routes
router.delete("/:categoryId", isAdmin, deleteCategory);
router.delete(
  "/:categoryId/subcategories/:subCategoryId",
  isAdmin,
  deleteSubCategory
);
router.delete(
  "/:categoryId/subcategories/:subCategoryId/subsubcategories/:subSubCategoryId",
  isAdmin,
  deleteSubSubCategory
);

//get routes
router.get("/", getCategories);
router.get("/most-demanded", getDemandedCategories);

module.exports = router;
