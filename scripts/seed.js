require("dotenv").config();
const { connectDB } = require("../config/db");
const seedAdmins = require("../utils/adminSeed");

const importData = async () => {
  try {
    await connectDB();
    await seedAdmins();
    console.log("Data inserted successfully!");
    process.exit();
  } catch (error) {
    console.error("Error importing data:", error.message);
    process.exit(1);
  }
};

importData();