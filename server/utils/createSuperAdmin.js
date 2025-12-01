const User = require('../models/User');

// Helper script to create initial Super Admin
const createSuperAdmin = async () => {
  try {
    // Check if super admin exists
    const superAdminExists = await User.findOne({ role: 'super_admin' });

    if (superAdminExists) {
      console.log('Super Admin already exists');
      return;
    }

    // Create super admin
    const superAdmin = await User.create({
      name: 'Haris',
      email: 'haris@sgceducation.com',
      password: 'superadmin',
      role: 'super_admin'
    });

    console.log('Super Admin created successfully!');
    console.log('Email: haris@sgceducation.com');
    console.log('Password: superadmin');
  } catch (error) {
    console.error('Error creating Super Admin:', error.message);
  }
};

module.exports = createSuperAdmin;
