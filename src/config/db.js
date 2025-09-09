const mongoose = require('mongoose');
require('dotenv').config(); // Load env variables

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ MongoDB connected successfully');
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    process.exit(1); // Exit if connection fails
  }
};

module.exports = connectDB;
