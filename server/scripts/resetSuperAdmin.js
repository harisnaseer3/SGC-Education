const mongoose = require('mongoose');
require('dotenv').config();
const User = require('../models/User');

const resetSuperAdmin = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/sgceducation');
    console.log('Connected to MongoDB');

    // Delete existing super admin
    await User.deleteMany({ role: 'super_admin' });
    console.log('Deleted old Super Admin');

    // Create new super admin
    const superAdmin = await User.create({
      name: 'Haris',
      email: 'haris@sgceducation.com',
      password: 'superadmin',
      role: 'super_admin'
    });

    console.log('✅ New Super Admin created successfully!');
    console.log('Email: haris@sgceducation.com');
    console.log('Password: superadmin');

    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
};

resetSuperAdmin();
