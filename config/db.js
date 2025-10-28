const mongoose = require("mongoose");
require("dotenv").config();

const user = encodeURIComponent(process.env.MONGODB_USER);
const pass = encodeURIComponent(process.env.MONGODB_PASS);

const connectDB = async () => {
  try {
    await mongoose.connect(
      `mongodb+srv://${user}:${pass}@cluster0.pctlstp.mongodb.net/socket?retryWrites=true&w=majority&appName=Cluster0`
    );
    console.log("✅ Connected to MongoDB");
  } catch (err) {
    console.error("❌ Database connection error:", err);
    process.exit(1);
  }
};

module.exports = connectDB;
