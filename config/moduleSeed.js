const moduleModel = require("../models/moduleModel");

const defaultModules = [
  {
    moduleId: "dashboard",
    name: "Dashboard",
    description: "System dashboard and overview",
    isSystemModule: true,
    permissions: [{ name: "Read", description: "View dashboard" }],
  },
  {
    moduleId: "manage category",
    name: "Manage Category",
    description: "Manage category system",
    permissions: [
      { name: "Read", description: "View users" },
      { name: "Write", description: "Create/update users" },
      { name: "Delete", description: "Delete users" },
      { name: "Manage", description: "Full user management" },
    ],
  },
  {
    moduleId: "manage catalog",
    name: "Manage Catlog",
    description: "Manage catalog system",
    permissions: [
      { name: "Read", description: "View roles" },
      { name: "Write", description: "Create/update roles" },
      { name: "Delete", description: "Delete roles" },
    ],
  },
  {
    moduleId: "manage product",
    name: "Manage Product",
    description: "Manage product system",
    permissions: [
      { name: "Read", description: "View content" },
      { name: "Write", description: "Create/update content" },
      { name: "Delete", description: "Delete content" },
    ],
  },

  {
    moduleId: "manage orders",
    name: "Manage Orders",
    description: "Manage Orders system",
    permissions: [
      { name: "Read", description: "View content" },
      { name: "Write", description: "Create/update content" },
      { name: "Delete", description: "Delete content" },
    ],
  },

  {
    moduleId: "manage business",
    name: "Manage Business",
    description: "Manage Business system",
    permissions: [
      { name: "Read", description: "View content" },
      { name: "Write", description: "Create/update content" },
      { name: "Delete", description: "Delete content" },
    ],
  },

  {
    moduleId: "Revenue & Statistics",
    name: "Revenue & Statistics",
    description: "Manage revenue & statistics system",
    permissions: [
      { name: "Read", description: "View content" },
      { name: "Write", description: "Create/update content" },
      { name: "Delete", description: "Delete content" },
    ],
  },

  {
    moduleId: "Action & monitoring",
    name: "Action & Monitoring",
    description: "Manage action & monitoring system",
    permissions: [
      { name: "Read", description: "View content" },
      { name: "Write", description: "Create/update content" },
      { name: "Delete", description: "Delete content" },
    ],
  },

  {
    moduleId: "manage advetisement",
    name: "Manage Advetisement",
    description: "Manage advetisement system",
    permissions: [
      { name: "Read", description: "View content" },
      { name: "Write", description: "Create/update content" },
      { name: "Delete", description: "Delete content" },
    ],
  },

  {
    moduleId: "manage Subscriptions",
    name: "Manage Subscriptions",
    description: "Manage subscriptions system",
    permissions: [
      { name: "Read", description: "View content" },
      { name: "Write", description: "Create/update content" },
      { name: "Delete", description: "Delete content" },
    ],
  },

  {
    moduleId: "manage Leads",
    name: "Manage Leads",
    description: "Manage Leads system",
    permissions: [
      { name: "Read", description: "View content" },
      { name: "Write", description: "Create/update content" },
      { name: "Delete", description: "Delete content" },
    ],
  },

  {
    moduleId: "manage Inquiry",
    name: "Manage Inquiry",
    description: "Manage inquiry system",
    permissions: [
      { name: "Read", description: "View content" },
      { name: "Write", description: "Create/update content" },
      { name: "Delete", description: "Delete content" },
    ],
  },

  {
    moduleId: "manage Users",
    name: "Manage Users",
    description: "Manage users system",
    permissions: [
      { name: "Read", description: "View content" },
      { name: "Write", description: "Create/update content" },
      { name: "Delete", description: "Delete content" },
    ],
  },

  {
    moduleId: "manage subscribers",
    name: "Manage Subscribers",
    description: "Manage subscribers system",
    permissions: [
      { name: "Read", description: "View content" },
      { name: "Write", description: "Create/update content" },
      { name: "Delete", description: "Delete content" },
    ],
  },

  //   {
  //   moduleId: "manage Admin",
  //   name: "Manage Admin",
  //   description: "Manage product system",
  //   permissions: [
  //     { name: "Read", description: "View content" },
  //     { name: "Write", description: "Create/update content" },
  //     { name: "Delete", description: "Delete content" },
  //   ],
  // },

  {
    moduleId: "manage website",
    name: "Manage Website",
    description: "Manage website system",
    permissions: [
      { name: "Read", description: "View content" },
      { name: "Write", description: "Create/update content" },
      { name: "Delete", description: "Delete content" },
    ],
  },

  {
    moduleId: "settings",
    name: "Settings",
    description: "Manage system configuration",
    isSystemModule: true,
    permissions: [
      { name: "Read", description: "View settings" },
      { name: "Write", description: "Update settings" },
    ],
  },
];

const seedModules = async () => {
  try {
    const exists = await moduleModel.countDocuments({});
    if (exists > 0) return;

    // await moduleModel.deleteMany({});
    await moduleModel.insertMany(defaultModules);
    console.log("Modules seeded successfully");
  } catch (error) {
    console.error("Error seeding modules:", error);
  }
};

module.exports = seedModules;
