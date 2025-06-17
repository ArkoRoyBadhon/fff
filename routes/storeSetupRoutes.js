const express = require("express");
const router = express.Router();
const { protect, authorize } = require("../middleware/authMiddleware");
const { isAdmin } = require("../middleware/adminMiddleware");
const {
  createStore,
  getFilePreview,
  updateStoreStatus,
  getStoreStatus,
  getStoreDetails,
  getAllStores,
  updateStore,
  getAllStoresForUser,
  getTopVerifiedExporters,
  getStoreById, 
} = require("../controller/storeSetupController");
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
    const filetypes = /jpeg|jpg|png|pdf/;
    const extname = filetypes.test(
      path.extname(file.originalname).toLowerCase()
    );
    const mimetype = filetypes.test(file.mimetype);
    if (extname && mimetype) {
      return cb(null, true);
    }
    cb(new Error("Error: Only images (JPEG, JPG, PNG) and PDFs are allowed!"));
  },
}).fields([
  { name: "storeLogo", maxCount: 1 },
  { name: "coverImage", maxCount: 1 },
  { name: "businessRegistration", maxCount: 1 },
  { name: "taxId", maxCount: 1 },
  { name: "proofOfAddress", maxCount: 1 },
  { name: "ownerIdentification", maxCount: 1 },
  { name: "additionalDocuments", maxCount: 4 },
]);

const updateUpload = multer({
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
}).fields([
  { name: "storeLogo", maxCount: 1 },
  { name: "coverImage", maxCount: 1 },
]);

router.post(
  "/setup",
  protect,
  authorize("seller", "admin"),
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
  createStore
);

router.put(
  "/update",
  protect,
  authorize("seller"),
  (req, res, next) => {
    updateUpload(req, res, (err) => {
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
  updateStore
);

router.get("/status", protect, authorize("seller", "admin"), getStoreStatus);
router.get("/details", protect, authorize("seller", "admin"), getStoreDetails);
router.get("/all", isAdmin, getAllStores);
router.get("/all-for-user", getAllStoresForUser);
router.get("/preview/:filename", getFilePreview);
router.put("/status", isAdmin, updateStoreStatus);
router.get("/top-verified-exporters", getTopVerifiedExporters);
router.get("/:id", getStoreById);

module.exports = router;
