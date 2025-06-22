const Product = require("../models/Product");
const mongoose = require("mongoose");
const Category = require("../models/Category");
const { languageCodes } = require("../utils/data");
const User = require("../models/User");
const requestIp = require("request-ip");
const StoreSetup = require("../models/StoreSetup");
const Catalog = require("../models/Catalog");
const Order = require("../models/Order");

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
    categoryType,

    period,
  } = req.query;

  const ip =
    req.headers["x-forwarded-for"]?.split(",")[0] ||
    req.connection?.remoteAddress;

  console.log("Real IP:", ip);
  console.log("Real IP:", req.headers["X-User-IP"]);

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

  // if (category) {
  //   queryObject.category = new mongoose.Types.ObjectId(category);
  // }

  if (category) {
    if (Number(categoryType) === 1) {
      queryObject.subCategory = {
        $in: [new mongoose.Types.ObjectId(category)],
      };
    } else if (Number(categoryType) === 2) {
      queryObject.subSubCategory = {
        $in: [new mongoose.Types.ObjectId(category)],
      };
    } else {
      queryObject.category = new mongoose.Types.ObjectId(category);
    }
  }

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

    let queryObjectOrder = {};
    if (period) {
      const now = new Date();
      let startDate;

      if (period === "year") {
        startDate = new Date(now.getFullYear(), 0, 1); // Start of the year
      } else if (period === "month") {
        startDate = new Date(now.getFullYear(), now.getMonth(), 1); // Start of the month
      }

      if (startDate) {
        queryObjectOrder.createdAt = { $gte: startDate };
      }
    }

    const orderData = await Order.find(queryObjectOrder);

    console.log("order data ===", orderData);

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

const YearlyProductController = async (req, res) => {
  const { page = 1, limit = 10, period } = req.query;

  let queryObject = {};
  let sortObject = { _id: -1 }; // Default sort

  try {
    const total = await Product.countDocuments(queryObject);

    const now = new Date();

    const yearlyStartDate = new Date(now.getFullYear(), 0, 1);
    const yearlyOrderFilter = {
      createdAt: { $gte: yearlyStartDate },
      status: { $nin: ["Cancelled", "Return"] },
    };

    const monthlyStartDate = new Date();
    monthlyStartDate.setDate(monthlyStartDate.getDate() - 29);
    const monthlyOrderFilter = {
      createdAt: { $gte: monthlyStartDate },
      status: { $nin: ["Cancelled", "Return"] },
    };

    // Get orders with total amount
    const [yearlyOrders, monthlyOrders] = await Promise.all([
      Order.find(yearlyOrderFilter).select("product quantity status total"),
      Order.find(monthlyOrderFilter).select("product quantity status total"),
    ]);

    // Calculate product quantities and totals
    const yearlyProductStats = yearlyOrders.reduce((acc, order) => {
      if (order.product) {
        const productId = order.product.toString();
        acc[productId] = acc[productId] || { quantity: 0, totalAmount: 0 };
        acc[productId].quantity += order.quantity;
        acc[productId].totalAmount += order.total || 0;
      }
      return acc;
    }, {});

    const monthlyProductStats = monthlyOrders.reduce((acc, order) => {
      if (order.product) {
        const productId = order.product.toString();
        acc[productId] = acc[productId] || { quantity: 0, totalAmount: 0 };
        acc[productId].quantity += order.quantity;
        acc[productId].totalAmount += order.total || 0;
      }
      return acc;
    }, {});

    let products = await Product.find(queryObject)
      .populate("seller")
      .populate({
        path: "catalog",
        populate: {
          path: "storeId",
          model: "Store",
          select:
            "storeName storeLogo country city status rating businessSector", // Add more fields as needed
        },
      })
      .sort(sortObject)
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit));

    products = products.map((product) => {
      const productId = product._id.toString();
      const yearlyStats = yearlyProductStats[productId] || {
        quantity: 0,
        totalAmount: 0,
      };
      const monthlyStats = monthlyProductStats[productId] || {
        quantity: 0,
        totalAmount: 0,
      };

      // Extract store information from populated catalog
      const storeInfo = product.catalog?.storeId
        ? {
            storeId: product.catalog.storeId._id,
            storeName: product.catalog.storeId.storeName,
            storeLogo: product.catalog.storeId.storeLogo,
            country: product.catalog.storeId.country,
            city: product.catalog.storeId.city,
            status: product.catalog.storeId.status,
            rating: product.catalog.storeId.rating,
            businessSector: product.catalog.storeId.businessSector,
            // Add more store fields as needed
          }
        : null;

      return {
        ...product.toObject(),
        store: storeInfo, // Add store information to the product object
        yearlyOrderedQuantity: yearlyStats.quantity,
        yearlyOrderTotal: yearlyStats.totalAmount,
        monthlyOrderedQuantity: monthlyStats.quantity,
        monthlyOrderTotal: monthlyStats.totalAmount,
      };
    });

    // Apply sorting based on period parameter
    if (period === "year") {
      products.sort(
        (a, b) => b.yearlyOrderedQuantity - a.yearlyOrderedQuantity
      );
    } else if (period === "month") {
      products.sort(
        (a, b) => b.monthlyOrderedQuantity - a.monthlyOrderedQuantity
      );
    }

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

const getAllProductsAdmin = async (req, res) => {
  const {
    search,
    category,
    subCategory,
    subSubCategory,
    minOrder,
    status,
    price,
    minPrice,
    maxPrice,
    country,
    page = 1,
    limit = 10,
    period,
    orderValue,
  } = req.query;

  let queryObject = {};
  let sortObject = { sold: -1 };

  // Search
  if (search) {
    try {
      const searchRegex = new RegExp(search, "i");
      const matchingStores = await StoreSetup.find({ storeName: searchRegex });
      const storeIds = matchingStores.map((store) => store._id);

      const matchingCatalogs = await Catalog.find({
        storeId: { $in: storeIds },
      }).select("_id");

      const matchingSellers = await User.find({
        companyName: searchRegex,
      }).select("_id");

      const catalogIds = matchingCatalogs.map((catalog) => catalog._id);
      const sellerIds = matchingSellers.map((seller) => seller._id);

      queryObject.$or = [
        { title: searchRegex },
        { description: searchRegex },
        ...(sellerIds.length > 0 ? [{ seller: { $in: sellerIds } }] : []),
        ...(catalogIds.length > 0 ? [{ catalog: { $in: catalogIds } }] : []),
      ];
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: "Error processing search",
        error: err.message,
      });
    }
  }

  if (orderValue) {
    queryObject.orderValue = { $gte: Number(orderValue) };
  }

  if (period) {
    const now = new Date();
    let startDate;

    if (period === "year") {
      startDate = new Date(now.getFullYear(), 0, 1); // Start of the year
    } else if (period === "month") {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1); // Start of the month
    }

    if (startDate) {
      queryObject.createdAt = { $gte: startDate }; // Filter products created since `startDate`
    }
  }

  // Filters
  if (category) queryObject.category = new mongoose.Types.ObjectId(category);
  if (subCategory)
    queryObject.subCategory = new mongoose.Types.ObjectId(subCategory);
  if (subSubCategory)
    queryObject.subSubCategory = new mongoose.Types.ObjectId(subSubCategory);
  if (minOrder) queryObject.minOrder = { $gte: Number(minOrder) };
  if (status) queryObject.status = status;
  if (minPrice || maxPrice) {
    queryObject.price = {};
    if (minPrice) queryObject.price.$gte = Number(minPrice);
    if (maxPrice) queryObject.price.$lte = Number(maxPrice);
  }

  // Sorting
  if (price === "low") sortObject = { price: 1 };
  if (price === "high") sortObject = { price: -1 };

  // Country Filter
  if (country) {
    const sellers = await User.find({
      country: { $regex: new RegExp(`^${country}$`, "i") },
    }).select("_id");
    if (sellers.length > 0) {
      queryObject.seller = { $in: sellers.map((s) => s._id) };
    } else {
      return res.json({
        success: true,
        products: [],
        stats: {},
        total: 0,
        limits: Number(limit),
        pages: 0,
      });
    }
  }

  try {
    // Fetch stats and products
    const [
      total,
      totalProducts,
      activeProductsCount,
      newProductsWeekCount,
      newProductsMonthCount,
      products,
    ] = await Promise.all([
      Product.countDocuments(queryObject),
      Product.countDocuments(),
      Product.countDocuments({ ...queryObject, status: "show" }),
      Product.countDocuments({
        ...queryObject,
        createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      }),
      Product.countDocuments({
        ...queryObject,
        createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
      }),
      Product.find(queryObject)
        .populate("seller", "companyName country")
        .populate({
          path: "catalog",
          populate: { path: "storeId", model: "Store" },
        })
        .sort(sortObject),
      // .skip((Number(page) - 1) * Number(limit))
      // .limit(Number(limit)),
    ]);

    res.json({
      success: true,
      products,
      stats: {
        totalProducts,
        activeProducts: activeProductsCount,
        newProductsWeek: newProductsWeekCount,
        newProductsMonth: newProductsMonthCount,
      },
      total,
      limits: Number(limit),
      pages: Math.ceil(total / Number(limit)),
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Error fetching products",
      error: err.message,
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
      product.category = req.body.category || product.category;
      product.subCategory = req.body.subCategory || product.subCategory;
      product.subSubCategory =
        req.body.subSubCategory || product.subSubCategory;
      product.orderValue =
        (req.body.orderValue && req.body.orderValue + product.orderValue) ||
        product.orderValue;

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
    const userId = req.user._id;
    const queryObject = { status: "show" };
    const { search, category, title, slug, page = 1, limit = 20 } = req.query;

    // Convert page and limit to numbers
    const pageNumber = parseInt(page);
    const limitNumber = parseInt(limit);
    const skip = (pageNumber - 1) * limitNumber;

    queryObject.seller = userId;

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
          Product.find({ status: "show", seller: userId })
            .populate({ path: "category", select: "name _id" })
            .populate({
              path: "catalog",
              populate: [
                {
                  path: "categories",
                  select: "name _id",
                },
                {
                  path: "subCategories",
                  select: "name _id",
                  populate: {
                    path: "subSubCategories",
                    select: "name _id",
                  },
                },
                {
                  path: "subSubCategories",
                  select: "name _id",
                },
              ],
            })
            .populate("category")
            .populate("subCategory")
            .populate("subSubCategory")
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

const getStoreProducts = async (req, res) => {
  try {
    console.log("get store products", req.params.id);

    const products = await Product.find({ seller: req.params.id }).populate({
      path: "category",
    });
    res.send(products);
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
  getAllProductsAdmin,
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
  getStoreProducts,
  YearlyProductController,
};
