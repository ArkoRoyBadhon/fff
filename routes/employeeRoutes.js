const express = require("express");
const router = express.Router();
const employeeController = require("../controller/employeeController");
const { isAdmin } = require("../middleware/adminMiddleware");

router.post("/employeeLogin", employeeController.employeeLogin);
router.get("/", isAdmin, employeeController.getAllEmployees);
router.post("/", isAdmin, employeeController.createEmployee);
router.put("/:id", isAdmin, employeeController.updateEmployee);
router.delete("/:id", isAdmin, employeeController.deleteEmployee);
router.post(
  "/permissions",
  isAdmin,
  employeeController.updateEmployeePermissions
);
router.get("/employee-profile", isAdmin, employeeController.getEmployeeProfile);

module.exports = router;
