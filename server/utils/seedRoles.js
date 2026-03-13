const Role = require('../models/Role');
const { ROLE_PERMISSIONS, USER_ROLES } = require('./constants');

/**
 * Seeds default roles from constants into the database if they don't exist
 */
const seedRoles = async () => {
  try {
    console.log('🌱 Checking for default roles to seed...');
    
    for (const [roleName, permissions] of Object.entries(ROLE_PERMISSIONS)) {
      // Logic: If role doesn't exist, create it. If it exists and is a system role, update its permissions?
      // Actually, let's only create if it doesn't exist to avoid overwriting manual changes 
      // unless we want system roles to be strictly tied to codebase.
      // For this transition, we create them as isSystemRole: true.
      
      const existingRole = await Role.findOne({ name: roleName });
      
      if (!existingRole) {
        console.log(`+ Creating system role: ${roleName}`);
        await Role.create({
          name: roleName,
          permissions: permissions,
          isSystemRole: true,
          description: `Built-in system role for ${roleName}`
        });
      } else if (existingRole.isSystemRole) {
        // Optionally update permissions of system roles to match constants
        // console.log(`~ Updating system role permissions: ${roleName}`);
        // existingRole.permissions = permissions;
        // await existingRole.save();
      }
    }
    
    console.log('✅ Role seeding completed.');
  } catch (err) {
    console.error('❌ Role seeding failed:', err.message);
  }
};

module.exports = seedRoles;
