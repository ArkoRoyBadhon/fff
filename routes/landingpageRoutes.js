const express = require("express");
const { getAllSections, getSection, updateSection } = require("../controller/landingPageController");
const router = express.Router();

router.get("/", getAllSections);

router.get("/:sectionType", getSection);

router.put("/:sectionType", updateSection);

module.exports = router;
