try {
  console.log('Testing require chain...');
  const backupService = require('./services/backup.service');
  console.log('✅ backup.service loaded');
  const backupController = require('./controllers/backup.controller');
  console.log('✅ backup.controller loaded');
  const backupRoutes = require('./routes/v1/backup.routes');
  console.log('✅ backup.routes loaded');
  console.log('Full chain requirement successful!');
} catch (error) {
  console.error('❌ Chain failure:', error);
}
