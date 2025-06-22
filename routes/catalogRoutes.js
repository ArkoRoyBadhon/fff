const express = require("express");
const router = express.Router();
const { protect, authorize } = require("../middleware/authMiddleware");
const { isAdmin } = require("../middleware/adminMiddleware");
const {
  createCatalog,
  editCatalog,
  getCatalogStatus,
  getCatalogs,
  getAllCatalogs,
  updateCatalogStatus,
  deleteCatalog,
  getFilePreview,
  getCatalogsAdmin,
} = require("../controller/catalogController");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const uploadDir = path.join(__dirname, "../public/uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png/;
    const extname = filetypes.test(
      path.extname(file.originalname).toLowerCase()
    );
    const mimetype = filetypes.test(file.mimetype);
    if (extname && mimetype) {
      return cb(null, true);
    }
    cb(new Error("Error: Only images (JPEG, JPG, PNG) are allowed!"));
  },
}).fields([{ name: "image", maxCount: 1 }]);

router.post(
  "/create",
  protect,
  authorize("seller"),
  (req, res, next) => {
    upload(req, res, (err) => {
      if (err) {
        console.error("Multer error:", err.message);
        return res.status(400).json({
          success: false,
          message: err.message,
        });
      }
      console.log("Files received:", req.files);
      next();
    });
  },
  createCatalog
);

router.put(
  "/edit",
  protect,
  authorize("seller"),
  (req, res, next) => {
    upload(req, res, (err) => {
      if (err) {
        console.error("Multer error:", err.message);
        return res.status(400).json({
          success: false,
          message: err.message,
        });
      }
      console.log("Files received:", req.files);
      next();
    });
  },
  editCatalog
);

router.get("/status", protect, authorize("seller"), getCatalogStatus);
router.get("/catalogs", protect, authorize("seller"), getCatalogs);
router.get("/catalogs/:sellerId", isAdmin, getCatalogsAdmin);
router.get("/all", isAdmin, getAllCatalogs);
router.put("/status", isAdmin, updateCatalogStatus);
router.delete(
  "/delete/:catalogId",
  protect,
  authorize("seller"),
  deleteCatalog
);
router.get("/preview/:filename", getFilePreview);

module.exports = router;
