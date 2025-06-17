const cloudinary = require("cloudinary").v2;

// Cloudinary configuration (if not already set globally)
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const deleteImage = async (req, res) => {
  const { public_id } = req.body;

  if (!public_id) {
    return res.status(400).json({ message: "Public ID is required" });
  }

  try {
    // Deleting image from Cloudinary
    const result = await cloudinary.uploader.destroy(public_id);

    if (result.result === "ok") {
      return res.status(200).json({ message: "Image deleted successfully" });
    } else {
      return res.status(500).json({ message: "Error deleting image" });
    }
  } catch (error) {
    // console.error(error);
    return res.status(500).json({ message: "Error deleting image" });
  }
};

module.exports = {
  deleteImage,
};
