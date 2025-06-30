const Employee = require("../models/Employee");
const Role = require("../models/Role");
const jwt = require("jsonwebtoken");

const generateAdminToken = (id) => {
  return jwt.sign(
    {
      id,
      role: "admin",
    },
    process.env.JWT_SECRET,
    {
      expiresIn: "1d",
    }
  );
};

const getAllEmployees = async (req, res) => {
  try {
    const employees = await Employee.find().populate("roleId");
    res.json(employees);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const createEmployee = async (req, res) => {
  const { name, email, password, roleId } = req.body;

  try {
    const roleExists = await Role.findById(roleId);
    if (!roleExists) return res.status(400).json({ message: "Role not found" });

    const newEmployee = new Employee({
      name,
      email,
      password,
      roleId,
      customAccess: [],
    });

    const savedEmployee = await newEmployee.save();
    res.status(201).json(savedEmployee);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

const updateEmployee = async (req, res) => {
  try {
    const updatedEmployee = await Employee.findByIdAndUpdate(
      req.params.id,
      { $set: req.body, updatedAt: Date.now() },
      { new: true }
    ).populate("roleId");
    res.json(updatedEmployee);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

const deleteEmployee = async (req, res) => {
  try {
    await Employee.findByIdAndDelete(req.params.id);
    res.json({ message: "Employee deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const updateEmployeePermissions = async (req, res) => {
  const { employeeId, moduleId, permission, value } = req.body;
  console.log("dddddddd", req.body);

  try {
    const employee = await Employee.findById(employeeId);
    if (!employee)
      return res.status(404).json({ message: "Employee not found" });

    let customAccess = employee.customAccess || [];
    const moduleIndex = customAccess.findIndex(
      (access) => access.moduleId === moduleId
    );

    if (permission === "module_access") {
      if (value) {
        if (moduleIndex === -1) {
          customAccess.push({ moduleId, permissions: ["Read"] });
        }
      } else {
        customAccess = customAccess.filter(
          (access) => access.moduleId !== moduleId
        );
      }
    } else {
      if (moduleIndex === -1 && value) {
        customAccess.push({ moduleId, permissions: [permission] });
      } else if (moduleIndex !== -1) {
        if (value) {
          if (!customAccess[moduleIndex].permissions.includes(permission)) {
            customAccess[moduleIndex].permissions.push(permission);
          }
        } else {
          customAccess[moduleIndex].permissions = customAccess[
            moduleIndex
          ].permissions.filter((p) => p !== permission);

          if (customAccess[moduleIndex].permissions.length === 0) {
            customAccess = customAccess.filter(
              (access) => access.moduleId !== moduleId
            );
          }
        }
      }
    }

    employee.customAccess = customAccess;
    employee.updatedAt = Date.now();
    await employee.save();

    const updatedEmployee = await Employee.findById(employeeId).populate(
      "roleId"
    );
    res.json(updatedEmployee);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

const employeeLogin = async (req, res) => {
  const { email, password } = req.body;

  try {
    const employee = await Employee.findOne({ email }).select("+password");

    if (!employee) {
      return res.status(401).json({
        success: false,
        message: "Employee not found",
      });
    }

    const isMatch = await employee.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    console.log("token prev", isMatch);
    const token = generateAdminToken(employee._id);
    console.log("token", token);
    const employeeData = await Employee.findById(employee._id)
      .populate("roleId")
      .select("-password");

    res.json({
      success: true,
      token,
      employee: employeeData,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

const getEmployeeProfile = async (req, res) => {
  try {
    console.log("req.admin._id", req.admin._id);

    const employee = await Employee.findById(req.admin._id)
      .populate("roleId")
      .select("-password")
      .lean();

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Employee not found",
      });
    }

    res.json(employee);
  } catch (error) {
    console.error("Employee profile error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

module.exports = {
  getAllEmployees,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  updateEmployeePermissions,
  employeeLogin,
  getEmployeeProfile,
};
