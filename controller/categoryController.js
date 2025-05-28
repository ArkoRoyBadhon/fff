const slugify = require("slugify");
const { Category, SubCategory, SubSubCategory } = require("../models/Category");

const createCategory = async (req, res) => {
  try {
    const { name, image, isActive = true } = req.body;

    const existingCategory = await Category.findOne({ name });
    if (existingCategory) {
      return res.status(400).json({
        success: false,
        message: "Category with this name already exists",
      });
    }

    const newCategory = await Category.create({
      name,
      image,
      isActive,
    });

    res.status(201).json({
      success: true,
      data: newCategory,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const createSubCategory = async (req, res) => {
  try {
    const { categoryId } = req.params;
    const { name, isActive = true } = req.body;

    // Check if subcategory already exists
    const existingSubCategory = await SubCategory.findOne({ name });
    if (existingSubCategory) {
      return res.status(400).json({
        success: false,
        message: "Subcategory with this name already exists",
      });
    }

    // Create new subcategory
    const newSubCategory = await SubCategory.create({
      name,
      isActive,
    });

    // Add subcategory to category
    const updatedCategory = await Category.findByIdAndUpdate(
      categoryId,
      {
        $push: { subCategories: newSubCategory._id },
      },
      { new: true }
    ).populate("subCategories");

    if (!updatedCategory) {
      // Clean up the created subcategory if category not found
      await SubCategory.findByIdAndDelete(newSubCategory._id);
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    res.status(201).json({
      success: true,
      data: updatedCategory,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const createSubSubCategory = async (req, res) => {
  try {
    const { subCategoryId } = req.params;
    const { name, isActive = true } = req.body;

    // Check if sub-subcategory already exists
    const existingSubSubCategory = await SubSubCategory.findOne({ name });
    if (existingSubSubCategory) {
      return res.status(400).json({
        success: false,
        message: "Sub-subcategory with this name already exists",
      });
    }

    // Create new sub-subcategory
    const newSubSubCategory = await SubSubCategory.create({
      name,
      isActive,
    });

    // Add sub-subcategory to subcategory
    const updatedSubCategory = await SubCategory.findByIdAndUpdate(
      subCategoryId,
      {
        $push: { subSubCategories: newSubSubCategory._id },
      },
      { new: true }
    ).populate("subSubCategories");

    if (!updatedSubCategory) {
      // Clean up the created sub-subcategory if subcategory not found
      await SubSubCategory.findByIdAndDelete(newSubSubCategory._id);
      return res.status(404).json({
        success: false,
        message: "Subcategory not found",
      });
    }

    res.status(201).json({
      success: true,
      data: updatedSubCategory,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const updateCategory = async (req, res) => {
  try {
    const { categoryId } = req.params;
    const updates = req.body;

    const updatedCategory = await Category.findByIdAndUpdate(
      categoryId,
      updates,
      { new: true, runValidators: true }
    );

    if (!updatedCategory) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    res.status(200).json({
      success: true,
      data: updatedCategory,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const updateSubCategory = async (req, res) => {
  try {
    const { subCategoryId } = req.params;
    const updates = req.body;

    const updatedSubCategory = await SubCategory.findByIdAndUpdate(
      subCategoryId,
      updates,
      { new: true, runValidators: true }
    );

    if (!updatedSubCategory) {
      return res.status(404).json({
        success: false,
        message: "Subcategory not found",
      });
    }

    res.status(200).json({
      success: true,
      data: updatedSubCategory,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const updateSubSubCategory = async (req, res) => {
  try {
    const { subSubCategoryId } = req.params;
    const updates = req.body;

    const updatedSubSubCategory = await SubSubCategory.findByIdAndUpdate(
      subSubCategoryId,
      updates,
      { new: true, runValidators: true }
    );

    if (!updatedSubSubCategory) {
      return res.status(404).json({
        success: false,
        message: "Sub-subcategory not found",
      });
    }

    res.status(200).json({
      success: true,
      data: updatedSubSubCategory,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const deleteCategory = async (req, res) => {
  try {
    const { categoryId } = req.params;

    // First find the category to get subcategory references
    const category = await Category.findById(categoryId);
    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    // Delete all subcategories and their sub-subcategories
    for (const subCategoryId of category.subCategories) {
      const subCategory = await SubCategory.findById(subCategoryId);
      if (subCategory) {
        // Delete all sub-subcategories
        await SubSubCategory.deleteMany({
          _id: { $in: subCategory.subSubCategories },
        });
        // Delete the subcategory
        await SubCategory.findByIdAndDelete(subCategoryId);
      }
    }

    // Finally delete the category
    await Category.findByIdAndDelete(categoryId);

    res.status(200).json({
      success: true,
      message: "Category and all its subcategories deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const deleteSubCategory = async (req, res) => {
  try {
    const { categoryId, subCategoryId } = req.params;

    // Remove subcategory from category
    const updatedCategory = await Category.findByIdAndUpdate(
      categoryId,
      {
        $pull: { subCategories: subCategoryId },
      },
      { new: true }
    );

    if (!updatedCategory) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    // Find the subcategory to get sub-subcategory references
    const subCategory = await SubCategory.findById(subCategoryId);
    if (!subCategory) {
      return res.status(404).json({
        success: false,
        message: "Subcategory not found",
      });
    }

    // Delete all sub-subcategories
    await SubSubCategory.deleteMany({
      _id: { $in: subCategory.subSubCategories },
    });

    // Delete the subcategory
    await SubCategory.findByIdAndDelete(subCategoryId);

    res.status(200).json({
      success: true,
      message: "Subcategory and all its sub-subcategories deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const deleteSubSubCategory = async (req, res) => {
  try {
    const { subCategoryId, subSubCategoryId } = req.params;

    // Remove sub-subcategory from subcategory
    const updatedSubCategory = await SubCategory.findByIdAndUpdate(
      subCategoryId,
      {
        $pull: { subSubCategories: subSubCategoryId },
      },
      { new: true }
    );

    if (!updatedSubCategory) {
      return res.status(404).json({
        success: false,
        message: "Subcategory not found",
      });
    }

    // Delete the sub-subcategory
    await SubSubCategory.findByIdAndDelete(subSubCategoryId);

    res.status(200).json({
      success: true,
      message: "Sub-subcategory deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const getCategories = async (req, res) => {
  try {
    const categories = await Category.find().populate({
      path: "subCategories",
      populate: {
        path: "subSubCategories",
      },
    });

    res.status(200).json({
      success: true,
      data: categories,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
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
};
