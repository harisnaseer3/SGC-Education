const backupService = require('../services/backup.service');
const { asyncHandler } = require('../middleware/error.middleware');

/**
 * @route   POST /api/v1/backups/download
 * @desc    Create and download a backup as ZIP
 * @access  Private (Super Admin only)
 */
const downloadBackup = asyncHandler(async (req, res) => {
  const { type = 'full' } = req.query;

  if (!['full', 'incremental'].includes(type)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid backup type. Use "full" or "incremental".'
    });
  }

  const { archive, backupLog, totalDocuments } = await backupService.createBackupStream(type, req.user);

  if (totalDocuments === 0 && type === 'incremental') {
    return res.json({
      success: true,
      message: 'No changes found since the last backup.',
      data: backupLog
    });
  }

  // Set response headers for file download
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `sgceducation_backup_${type}_${timestamp}.zip`;

  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

  // Pipe archive to response
  archive.pipe(res);

  // Handle archive errors
  archive.on('error', (err) => {
    console.error('Archive error:', err);
    if (!res.headersSent) {
      res.status(500).json({ success: false, message: 'Backup failed' });
    }
  });

  // Finalize the archive
  archive.finalize();
});

/**
 * @route   GET /api/v1/backups/history
 * @desc    Get backup history
 * @access  Private (Super Admin only)
 */
const getBackupHistory = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;

  const result = await backupService.getBackupHistory(page, limit);

  res.json({
    success: true,
    count: result.data.length,
    total: result.total,
    page: result.page,
    limit: result.limit,
    totalPages: Math.ceil(result.total / result.limit),
    data: result.data
  });
});

/**
 * @route   DELETE /api/v1/backups/:id
 * @desc    Delete a backup log entry
 * @access  Private (Super Admin only)
 */
const deleteBackupLog = asyncHandler(async (req, res) => {
  await backupService.deleteBackupLog(req.params.id);

  res.json({
    success: true,
    message: 'Backup log deleted successfully'
  });
});

/**
 * @route   POST /api/v1/backups/restore
 * @desc    Restore data from a backup ZIP file
 * @access  Private (Super Admin only)
 */
const restoreBackup = asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: 'No backup file uploaded'
    });
  }

  const results = await backupService.restoreBackup(req.file.buffer);

  res.json({
    success: true,
    message: 'Restore completed successfully',
    data: results
  });
});

module.exports = {
  downloadBackup,
  getBackupHistory,
  deleteBackupLog,
  restoreBackup
};
