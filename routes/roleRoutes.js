const express = require("express");
const router = express.Router();
const roleController = require("../controller/roleController");
const { isAdmin } = require("../middleware/adminMiddleware");

router.get("/", isAdmin, roleController.getAllRoles);
router.post("/", isAdmin, roleController.createRole);
router.put("/module-access", isAdmin, roleController.updateModuleAccess);
router.put("/:id", isAdmin, roleController.updateRole);
router.delete("/:id", isAdmin, roleController.deleteRole);

module.exports = router;
