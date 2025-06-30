const moduleModel = require("../models/moduleModel");
const Role = require("../models/Role");

// Get all roles
const getAllRoles = async (req, res) => {
  try {
    const roles = await Role.find();
    res.json(roles);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Create a new role
const createRole = async (req, res) => {
  const { name } = req.body;

  try {
    if (!name) {
      return res.status(400).json({ message: "Role name is required" });
    }

    const existingRole = await Role.findOne({ name });
    if (existingRole) {
      return res
        .status(400)
        .json({ message: "Role with this name already exists" });
    }

    const modules = await moduleModel.find({ enabled: true }).lean();

    const moduleAccess = modules.map((module) => ({
      moduleId: module.moduleId,
      name: module.name,
      enabled: false,
      permissions: [],
    }));

    // 5. Create and save the new role
    const newRole = new Role({
      name,
      moduleAccess,
      // createdAt and updatedAt will be set automatically by defaults
    });

    const savedRole = await newRole.save();

    // 6. Return success response
    res.status(201).json({
      message: "Role created successfully",
      role: savedRole,
    });
  } catch (err) {
    // Handle different types of errors appropriately
    if (err.name === "ValidationError") {
      return res.status(400).json({
        message: "Validation error",
        errors: err.errors,
      });
    }

    console.error("Error creating role:", err);
    res.status(500).json({
      message: "Internal server error",
      error: err.message,
    });
  }
};

// Update a role
const updateRole = async (req, res) => {
  try {
    const updatedRole = await Role.findByIdAndUpdate(
      req.params.id,
      { $set: req.body, updatedAt: Date.now() },
      { new: true }
    );
    res.json(updatedRole);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// Delete a role
const deleteRole = async (req, res) => {
  try {
    await Role.findByIdAndDelete(req.params.id);
    res.json({ message: "Role deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Update module access for a role
const updateModuleAccess = async (req, res) => {
  const { roleId, moduleId, enabled, permissions } = req.body;

  try {
    const role = await Role.findById(roleId);
    if (!role) return res.status(404).json({ message: "Role not found" });

    const moduleIndex = role.moduleAccess.findIndex((m) => m._id == moduleId);
    if (moduleIndex === -1)
      return res.status(404).json({ message: "Module not found" });

    if (enabled !== undefined) {
      role.moduleAccess[moduleIndex].enabled = enabled;
      if (
        enabled &&
        !role.moduleAccess[moduleIndex].permissions.includes("Read")
      ) {
        role.moduleAccess[moduleIndex].permissions.push("Read");
      } else if (!enabled) {
        role.moduleAccess[moduleIndex].permissions = [];
      }
    }

    if (permissions) {
      role.moduleAccess[moduleIndex].permissions = permissions;
    }

    role.updatedAt = Date.now();
    await role.save();
    res.json(role);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

module.exports = {
  getAllRoles,
  createRole,
  updateRole,
  deleteRole,
  updateModuleAccess,
};
