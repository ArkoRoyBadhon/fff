const bcrypt = require("bcryptjs");
const Admin = require("../models/Admin");

const admins = [
  {
    name: { en: "Marion V. Parker" },
    username: "marion_parker",
    image: "https://i.ibb.co/3zs3H7z/team-5.jpg",
    email: "marion@gmail.com",
    password: "12345678",
    phone: "713-675-8813",
    role: "admin",
    joiningData: new Date(),
    access_list: [
      "dashboard",
      "products",
      "categories",
      "attributes",
      "coupons",
      "customers",
      "orders",
      "our-staff",
      "settings",
      "languages",
      "currencies",
      "store",
      "customization",
      "store-settings",
      "notifications",
    ],
  },
  {
    name: { en: "Data Pollex" },
    username: "data_pollex",
    image: "https://ibb.co/z6ZsWMy",
    email: "admin@datapollex.com",
    password: "12345678",
    phone: "3456789987",
    role: "admin",
    joiningData: new Date(),
    access_list: [
      "dashboard",
      "products",
      "categories",
      "attributes",
      "coupons",
      "customers",
      "orders",
      "our-staff",
      "settings",
      "languages",
      "currencies",
      "store",
      "customization",
      "store-settings",
      "notifications",
    ],
  },
  {
    name: { en: "admin" },
    username: "super_admin",
    image: "https://i.ibb.co/WpM5yZZ/9.png",
    email: "admin@gmail.com",
    password: "12345678",
    phone: "360-943-7332",
    role: "super admin",
    joiningData: new Date(),
    access_list: [
      "dashboard",
      "products",
      "product",
      "categories",
      "attributes",
      "coupons",
      "orders",
      "order",
      "our-staff",
      "settings",
      "languages",
      "currencies",
      "store",
      "customization",
      "store-settings",
      "notifications",
      "edit-profile",
      "coming-soon",
      "customers",
      "customer-order",
    ],
  },
];

const seedAdmins = async () => {
  try {
    // Remove existing admins
    await Admin.deleteMany({});

    // Hash passwords and prepare admins
    const hashedAdmins = await Promise.all(
      admins.map(async (admin) => ({
        ...admin,
        password: await bcrypt.hash(admin.password, 10),
      }))
    );

    // Insert admins
    await Admin.insertMany(hashedAdmins);
    console.log("Admins seeded successfully");
  } catch (error) {
    console.error("Error seeding admins:", error.message);
    throw error;
  }
};

module.exports = seedAdmins;