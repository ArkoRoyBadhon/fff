const express = require("express");
const router = express.Router();
const { deleteImage } = require("../controller/deleteImage");

router.delete("/delete", deleteImage);

module.exports = router;
