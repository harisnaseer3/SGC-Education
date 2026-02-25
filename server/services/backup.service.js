const mongoose = require('mongoose');
const archiver = require('archiver');
const unzipper = require('unzipper');
const BackupLog = require('../models/BackupLog');

/**
 * Get all registered Mongoose model names (excluding BackupLog itself)
 */
const getCollectionNames = () => {
  return mongoose.modelNames().filter(name => name !== 'BackupLog');
};

/**
 * Get the last successful backup timestamp
 */
const getLastSuccessfulBackup = async () => {
  const lastBackup = await BackupLog.findOne({ status: 'completed' })
    .sort({ completedAt: -1 })
    .lean();
  return lastBackup ? lastBackup.completedAt : null;
};

/**
 * Create a backup ZIP stream containing JSON exports of all collections
 * @param {string} type - 'full' or 'incremental'
 * @param {object} user - requesting user
 * @returns {object} { archive, backupLog }
 */
const createBackupStream = async (type, user) => {
  const modelNames = getCollectionNames();
  const collectionsBackedUp = [];
  let totalDocuments = 0;

  // For incremental, get the last backup time
  let query = {};
  if (type === 'incremental') {
    const lastBackupTime = await getLastSuccessfulBackup();
    if (lastBackupTime) {
      query = { updatedAt: { $gte: lastBackupTime } };
    }
    // If no previous backup exists, fall back to full
  }

  // Create archive
  const archive = archiver('zip', { zlib: { level: 9 } });

  // Export each collection
  for (const modelName of modelNames) {
    try {
      const Model = mongoose.model(modelName);
      const documents = await Model.find(query).lean();

      if (documents.length > 0) {
        const jsonData = JSON.stringify(documents, null, 2);
        archive.append(jsonData, { name: `${modelName}.json` });

        collectionsBackedUp.push({
          name: modelName,
          documentCount: documents.length
        });
        totalDocuments += documents.length;
      }
    } catch (err) {
      // Some models might not have updatedAt field, do full export for those
      if (type === 'incremental' && err.message) {
        try {
          const Model = mongoose.model(modelName);
          const documents = await Model.find({}).lean();
          if (documents.length > 0) {
            const jsonData = JSON.stringify(documents, null, 2);
            archive.append(jsonData, { name: `${modelName}.json` });
            collectionsBackedUp.push({
              name: modelName,
              documentCount: documents.length
            });
            totalDocuments += documents.length;
          }
        } catch (innerErr) {
          console.error(`Error backing up ${modelName}:`, innerErr.message);
        }
      } else {
        console.error(`Error backing up ${modelName}:`, err.message);
      }
    }
  }

  // Add a metadata file
  const metadata = {
    backupType: type,
    timestamp: new Date().toISOString(),
    collections: collectionsBackedUp,
    totalDocuments,
    createdBy: user.name || user.email || user._id
  };
  archive.append(JSON.stringify(metadata, null, 2), { name: '_backup_metadata.json' });

  // Log the backup
  const backupLog = await BackupLog.create({
    type: collectionsBackedUp.length === 0 && type === 'incremental' ? 'incremental' : type,
    status: 'completed',
    completedAt: new Date(),
    collectionsBackedUp,
    totalDocuments,
    createdBy: user._id
  });

  return { archive, backupLog, totalDocuments };
};

/**
 * Delete backup logs older than 6 months
 */
const cleanupOldBackups = async () => {
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const result = await BackupLog.deleteMany({ createdAt: { $lt: sixMonthsAgo } });
  if (result.deletedCount > 0) {
    console.log(`[Backup Cleanup] Deleted ${result.deletedCount} backup logs older than 6 months`);
  }
  return result.deletedCount;
};

/**
 * Get backup history with pagination
 * @param {number} page - page number (1-indexed)
 * @param {number} limit - items per page
 */
const getBackupHistory = async (page = 1, limit = 10) => {
  // Auto-cleanup old logs on every fetch
  await cleanupOldBackups();

  const skip = (page - 1) * limit;
  const [data, total] = await Promise.all([
    BackupLog.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('createdBy', 'name email')
      .lean(),
    BackupLog.countDocuments()
  ]);

  return { data, total, page, limit };
};

/**
 * Delete a backup log entry
 */
const deleteBackupLog = async (id) => {
  const log = await BackupLog.findByIdAndDelete(id);
  if (!log) {
    const error = new Error('Backup log not found');
    error.statusCode = 404;
    throw error;
  }
  return log;
};

/**
 * Restore data from a backup ZIP buffer
 * @param {Buffer} zipBuffer - The ZIP file content
 */
const restoreBackup = async (zipBuffer) => {
  const directory = await unzipper.Open.buffer(zipBuffer);
  const results = {
    totalCollections: 0,
    totalDocuments: 0,
    errors: []
  };

  for (const file of directory.files) {
    if (file.path.endsWith('.json') && !file.path.startsWith('_')) {
      const modelName = file.path.replace('.json', '');
      try {
        const Model = mongoose.model(modelName);
        const content = await file.buffer();
        const documents = JSON.parse(content.toString());

        if (Array.isArray(documents) && documents.length > 0) {
          // Use replaceOne with upsert:true for each document based on _id
          // This ensures we either update existing or insert new, avoiding duplicates
          const bulkOps = documents.map(doc => ({
            replaceOne: {
              filter: { _id: doc._id },
              replacement: doc,
              upsert: true
            }
          }));

          await Model.bulkWrite(bulkOps);
          results.totalCollections++;
          results.totalDocuments += documents.length;
        }
      } catch (err) {
        results.errors.push({ collection: modelName, error: err.message });
        console.error(`Error restoring collection ${modelName}:`, err);
      }
    }
  }

  return results;
};

module.exports = {
  createBackupStream,
  getBackupHistory,
  deleteBackupLog,
  getLastSuccessfulBackup,
  restoreBackup
};
