/**
 * Migration Script: Add Organization Support
 * 
 * This script:
 * 1. Creates TIGES organization (for schools)
 * 2. Assigns all existing institutions to TIGES
 * 3. Verifies data integrity
 * 
 * Run: node server/scripts/migrateToOrganization.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const mongoose = require('mongoose');
const Organization = require('../models/Organization');
const Institution = require('../models/Institution');
const User = require('../models/User');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/sgceducation';

async function migrate() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Find or create super admin user for createdBy field
    let superAdmin = await User.findOne({ role: 'super_admin' });
    if (!superAdmin) {
      console.log('⚠️  No super admin found. Creating a temporary one for migration...');
      superAdmin = await User.create({
        name: 'Migration Admin',
        email: 'migration@sgc.com',
        password: 'temp123',
        role: 'super_admin'
      });
      console.log('✅ Created temporary super admin for migration');
    }

    // Step 1: Check if TIGES organization already exists
    let tigesOrg = await Organization.findOne({ code: 'TIGES' });
    
    if (!tigesOrg) {
      console.log('📝 Creating TIGES organization...');
      tigesOrg = await Organization.create({
        name: 'TIGES',
        code: 'TIGES',
        type: 'school',
        description: 'TIGES - Schools Organization',
        isActive: true,
        createdBy: superAdmin._id
      });
      console.log('✅ TIGES organization created:', tigesOrg._id);
    } else {
      console.log('ℹ️  TIGES organization already exists:', tigesOrg._id);
    }

    // Step 2: Get all existing institutions
    const institutions = await Institution.find({});
    console.log(`\n📊 Found ${institutions.length} institutions`);

    if (institutions.length === 0) {
      console.log('⚠️  No institutions found. Migration complete.');
      await mongoose.connection.close();
      return;
    }

    // Step 3: Assign all institutions to TIGES
    let updatedCount = 0;
    let skippedCount = 0;

    for (const institution of institutions) {
      if (institution.organization) {
        console.log(`⏭️  Skipping ${institution.name} - already has organization`);
        skippedCount++;
        continue;
      }

      institution.organization = tigesOrg._id;
      await institution.save();
      updatedCount++;
      console.log(`✅ Assigned ${institution.name} to TIGES`);
    }

    // Step 4: Verify migration
    console.log('\n🔍 Verifying migration...');
    const institutionsWithoutOrg = await Institution.countDocuments({ organization: { $exists: false } });
    const institutionsWithTiges = await Institution.countDocuments({ organization: tigesOrg._id });

    console.log('\n📈 Migration Summary:');
    console.log(`   - Institutions updated: ${updatedCount}`);
    console.log(`   - Institutions skipped: ${skippedCount}`);
    console.log(`   - Institutions without organization: ${institutionsWithoutOrg}`);
    console.log(`   - Institutions assigned to TIGES: ${institutionsWithTiges}`);

    if (institutionsWithoutOrg === 0 && institutionsWithTiges === institutions.length) {
      console.log('\n✅ Migration completed successfully!');
    } else {
      console.log('\n⚠️  Migration completed with warnings. Please review the data.');
    }

    // Step 5: Update organization stats
    const totalInstitutions = await Institution.countDocuments({ organization: tigesOrg._id, isActive: true });
    tigesOrg.stats.totalInstitutions = totalInstitutions;
    await tigesOrg.save();
    console.log(`✅ Updated TIGES stats: ${totalInstitutions} institutions`);

    await mongoose.connection.close();
    console.log('\n👋 Disconnected from MongoDB');
    process.exit(0);

  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

// Run migration
migrate();

