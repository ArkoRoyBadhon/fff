const Product = require("../models/Product");
const mongoose = require("mongoose");
const Category = require("../models/Category");
const { languageCodes } = require("../utils/data");
const User = require("../models/User");

const addProduct = async (req, res) => {
  try {
    const user = req.user;
    // const user = {
    //   _id: "680c4df91b825154b4a40c01",
    // };

    if (!user._id) {
      return res.status(400).send({
        message: "User not found",
      });
    }

    const newProduct = new Product({
      ...req.body,
      seller: user?._id,
    });

    await newProduct.save();
    res.send(newProduct);
  } catch (err) {
    res.status(500).send({
      message: err.message,
    });
  }
};

const addAllProducts = async (req, res) => {
  try {
    // console.log('product data',req.body)
    await Product.deleteMany();
    await Product.insertMany(req.body);
    res.status(200).send({
      message: "Product Added successfully!",
    });
  } catch (err) {
    res.status(500).send({
      message: err.message,
    });
  }
};

const getShowingProductsforCatalog = async (req, res) => {
  try {
    const { page = 1, limit = 12, catalogId } = req.query;

    const skip = (page - 1) * limit;
    const total = await Product.countDocuments({
      status: "show",
      catalog: catalogId,
    });

    let products;
    if (catalogId) {
      products = await Product.find({ status: "show", catalog: catalogId })
        .sort({ _id: -1 })
        .skip(skip)
        .limit(parseInt(limit));
    } else {
      products = await Product.find({ status: "show" })
        .sort({ _id: -1 })
        .skip(skip)
        .limit(parseInt(limit));
    }

    res.send({
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / limit),
      products,
    });
  } catch (err) {
    res.status(500).send({
      message: err.message,
    });
  }
};
const getShowingProducts = async (req, res) => {
  try {
    const { page = 1, limit = 12, catalogId } = req.query;

    const skip = (page - 1) * limit;
    const total = await Product.countDocuments({ status: "show" });

    let products;
    if (catalogId) {
      products = await Product.find({ status: "show", catalog: catalogId })
        .sort({ _id: -1 })
        .skip(skip)
        .limit(parseInt(limit));
    } else {
      products = await Product.find({ status: "show" })
        .sort({ _id: -1 })
        .skip(skip)
        .limit(parseInt(limit));
    }

    res.send({
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / limit),
      products,
    });
  } catch (err) {
    res.status(500).send({
      message: err.message,
    });
  }
};

const getAllProducts = async (req, res) => {
  const {
    title,
    category,
    price,
    minOrder,
    minPrice,
    maxPrice,
    country,
    paidSample,
    rating,
    page = 1,
    limit = 10,
    searchTerm,
  } = req.query;

  let queryObject = {};
  let sortObject = { _id: -1 };

  if (title) {
    const titleQueries = languageCodes.map((lang) => ({
      [`title.${lang}`]: { $regex: title, $options: "i" },
    }));
    queryObject.$or = titleQueries;
  }

  if (price === "low") {
    sortObject = { price: 1 };
  } else if (price === "high") {
    sortObject = { price: -1 };
  } else if (price === "published") {
    queryObject.status = "show";
  } else if (price === "unPublished") {
    queryObject.status = "hide";
  } else if (price === "status-selling") {
    queryObject.stock = { $gt: 0 };
  } else if (price === "status-out-of-stock") {
    queryObject.stock = { $lt: 1 };
  } else if (price === "date-added-asc") {
    sortObject.createdAt = 1;
  } else if (price === "date-added-desc") {
    sortObject.createdAt = -1;
  } else if (price === "date-updated-asc") {
    sortObject.updatedAt = 1;
  } else if (price === "date-updated-desc") {
    sortObject.updatedAt = -1;
  }

  if (category) queryObject.category = new mongoose.Types.ObjectId(category);
  if (minOrder) queryObject.minOrder = minOrder;
  if (minPrice || maxPrice) {
    queryObject.price = {};
    if (minPrice) queryObject.price.$gte = Number(minPrice);
    if (maxPrice) queryObject.price.$lte = Number(maxPrice);
  }
  if (paidSample === "true") queryObject.paidSample = true;
  if (rating) {
    queryObject["rating.average"] = { $gte: Number(rating) };
  }

  if (searchTerm) {
    queryObject["title"] = { $regex: searchTerm, $options: "i" };
  }

  try {
    let sellerIds = null;
    if (country) {
      const sellers = await User.find({
        country: { $regex: new RegExp(`^${country}$`, "i") },
      }).select("_id");
      sellerIds = sellers.map((s) => s._id);
    }

    if (sellerIds) {
      queryObject.seller = { $in: sellerIds };
    } else if (country) {
      return res.json({
        products: [],
        total: 0,
        limits: Number(limit),
        pages: Number(page),
      });
    }

    const total = await Product.countDocuments(queryObject);

    // Get paginated products
    const products = await Product.find(queryObject)
      .populate("seller")
      .populate({
        path: "catalog",
        populate: {
          path: "storeId",
          model: "Store",
          select: "storeName _id country",
        },
      })
      .sort(sortObject)
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit));

    res.json({
      products,
      total,
      limits: Number(limit),
      pages: Number(page),
    });
  } catch (err) {
    res.status(500).json({
      message: err.message,
      error: process.env.NODE_ENV === "development" ? err.stack : undefined,
    });
  }
};

const getProductBySlug = async (req, res) => {
  // console.log("slug", req.params.slug);
  try {
    const product = await Product.findOne({ slug: req.params.slug })
      .populate("seller")
      .populate({
        path: "catalog",
        populate: {
          path: "storeId",
          model: "Store",
          // select: "",
        },
      });
    res.send(product);
  } catch (err) {
    res.status(500).send({
      message: `Slug problem, ${err.message}`,
    });
  }
};

const getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate({ path: "category", select: "_id, name" })
      .populate({ path: "categories", select: "_id name" });

    res.send(product);
  } catch (err) {
    res.status(500).send({
      message: err.message,
    });
  }
};

const updateProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (product) {
      product.title = req.body.title || product.title;
      product.description = req.body.description || product.description;
      product.sku = req.body.sku || product.sku;
      product.slug = req.body.slug || product.slug;
      product.categories = req.body.categories || product.categories;
      product.image = req.body.image || product.image;
      product.tag = req.body.tag || product.tag;
      product.status = req.body.status || product.status;
      product.stock = req.body.stock || product.stock;
      product.attributes = req.body.attributes || product.attributes;
      product.price = req.body.price || product.price;
      product.salePrice = req.body.salePrice || product.salePrice;
      product.variants = req.body.variants || product.variants;
      product.minOrder = req.body.minOrder || product.minOrder;

      await product.save();

      res.status(200).send({
        data: product,
        message: "Product updated successfully!",
      });
    } else {
      res.status(404).send({
        message: "Product not found!",
      });
    }
  } catch (err) {
    res.status(500).send({
      message: "Error updating product.",
      error: err.message,
    });
  }
};

const updateManyProducts = async (req, res) => {
  try {
    const updatedData = {};
    for (const key of Object.keys(req.body)) {
      if (
        req.body[key] !== "[]" &&
        Object.entries(req.body[key]).length > 0 &&
        req.body[key] !== req.body.ids
      ) {
        // console.log('req.body[key]', typeof req.body[key]);
        updatedData[key] = req.body[key];
      }
    }

    // console.log("updated data", updatedData);

    await Product.updateMany(
      { _id: { $in: req.body.ids } },
      {
        $set: updatedData,
      },
      {
        multi: true,
      }
    );
    res.send({
      message: "Products update successfully!",
    });
  } catch (err) {
    res.status(500).send({
      message: err.message,
    });
  }
};

const updateStatus = (req, res) => {
  const newStatus = req.body.status;
  Product.updateOne(
    { _id: req.params.id },
    {
      $set: {
        status: newStatus,
      },
    },
    (err) => {
      if (err) {
        res.status(500).send({
          message: err.message,
        });
      } else {
        res.status(200).send({
          message: `Product ${newStatus} Successfully!`,
        });
      }
    }
  );
};

const deleteProduct = (req, res) => {
  Product.deleteOne({ _id: req.params.id }, (err) => {
    if (err) {
      res.status(500).send({
        message: err.message,
      });
    } else {
      res.status(200).send({
        message: "Product Deleted Successfully!",
      });
    }
  });
};

const getShowingStoreProducts = async (req, res) => {
  try {
    const queryObject = { status: "show" };
    const { search, category, title, slug, page = 1, limit = 20 } = req.query;

    // Convert page and limit to numbers
    const pageNumber = parseInt(page);
    const limitNumber = parseInt(limit);
    const skip = (pageNumber - 1) * limitNumber;

    if (category) {
      queryObject.categories = { $in: [category] };
    }

    if (search) {
      queryObject.title = { $regex: search, $options: "i" };
    }

    if (title) {
      queryObject.title = { $regex: title, $options: "i" };
    }

    if (slug) {
      queryObject.slug = { $regex: slug, $options: "i" };
    }

    let products = [];
    let popularProducts = [];
    let discountedProducts = [];
    let relatedProducts = [];
    let totalProducts = 0;

    if (slug) {
      const [productResult, relatedResult] = await Promise.all([
        Product.find(queryObject)
          .populate({ path: "category", select: "name _id" })
          .sort({ _id: -1 })
          .skip(skip)
          .limit(limitNumber),

        products.length > 0
          ? Product.find({
              category: products[0].category,
              _id: { $ne: products[0]._id },
            }).populate({ path: "category", select: "_id name" })
          : Promise.resolve([]),
      ]);

      products = productResult;
      relatedProducts = relatedResult;
      totalProducts = await Product.countDocuments(queryObject);
    } else if (title || category || search) {
      const [productResult, total] = await Promise.all([
        Product.find(queryObject)
          .populate({ path: "category", select: "name _id" })
          .sort({ _id: -1 })
          .skip(skip)
          .limit(limitNumber),

        Product.countDocuments(queryObject),
      ]);

      products = productResult;
      totalProducts = total;
    } else {
      const [productResult, popularResult, discountedResult, total] =
        await Promise.all([
          Product.find({ status: "show" })
            .populate({ path: "category", select: "name _id" })
            .sort({ _id: -1 })
            .skip(skip)
            .limit(limitNumber),

          Product.find({ status: "show" })
            .populate({ path: "category", select: "name _id" })
            .sort({ sales: -1 })
            .limit(20),

          Product.find({
            status: "show",
            $or: [
              {
                $and: [
                  { isCombination: true },
                  { variants: { $elemMatch: { discount: { $gt: "0.00" } } } },
                ],
              },
              {
                $and: [
                  { isCombination: false },
                  { $expr: { $gt: [{ $toDouble: "$prices.discount" }, 0] } },
                ],
              },
            ],
          })
            .populate({ path: "category", select: "name _id" })
            .sort({ _id: -1 })
            .limit(20),

          Product.countDocuments({ status: "show" }),
        ]);

      products = productResult;
      popularProducts = popularResult;
      discountedProducts = discountedResult;
      totalProducts = total;
    }

    res.send({
      products,
      popularProducts,
      relatedProducts,
      discountedProducts,
      pagination: {
        total: totalProducts,
        page: pageNumber,
        limit: limitNumber,
        totalPages: Math.ceil(totalProducts / limitNumber),
      },
    });
  } catch (err) {
    res.status(500).send({
      message: err.message,
    });
  }
};

const deleteManyProducts = async (req, res) => {
  try {
    const cname = req.cname;
    // console.log("deleteMany", cname, req.body.ids);

    await Product.deleteMany({ _id: req.body.ids });

    res.send({
      message: `Products Delete Successfully!`,
    });
  } catch (err) {
    res.status(500).send({
      message: err.message,
    });
  }
};

module.exports = {
  addProduct,
  addAllProducts,
  getAllProducts,
  getShowingProductsforCatalog,
  getShowingProducts,
  getProductById,
  getProductBySlug,
  updateProduct,
  updateManyProducts,
  updateStatus,
  deleteProduct,
  deleteManyProducts,
  getShowingStoreProducts,
};
