const User = require('../models/User');

// Helper script to create initial Super Admin
const createSuperAdmin = async () => {
  try {
    // Ensure developer account has isDeveloper: true
    await User.updateMany(
      { email: { $in: ['haris@sgceducation.com', process.env.DEVELOPER_EMAIL].filter(Boolean) } },
      { $set: { isDeveloper: true } }
    );

    // Check if super admin exists
    const superAdminExists = await User.findOne({ role: 'super_admin' });

    if (superAdminExists) {
      console.log('Super Admin already exists (developer flag verified)');
      return;
    }

    // Create super admin
    const superAdmin = await User.create({
      name: 'Haris',
      email: 'haris@sgceducation.com',
      password: 'superadmin',
      role: 'super_admin',
      isDeveloper: true
    });

    console.log('Super Admin created successfully!');
    console.log('Email: haris@sgceducation.com');
    console.log('Password: superadmin');
  } catch (error) {
    console.error('Error creating Super Admin:', error.message);
  }
};

module.exports = createSuperAdmin;
