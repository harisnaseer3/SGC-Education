const ActivityLog = require('../models/ActivityLog');

/**
 * Middleware to log user activities (Manual Specific route)
 */
const logActivity = (action, resource) => {
  return async (req, res, next) => {
    // Store original json method
    const originalJson = res.json.bind(res);

    // Override json method to log after response
    res.json = function(data) {
      // Call original json method
      originalJson(data);

      req._activityLogged = true; // flag to prevent global logger from duplicating

      // Log activity asynchronously (don't wait)
      if (req.user) {
        let clientIp = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.socket?.remoteAddress || req.ip || 'Unknown';
        if (clientIp === '::1') clientIp = '127.0.0.1';
        else if (clientIp.startsWith('::ffff:')) clientIp = clientIp.replace('::ffff:', '');

        const logData = {
          user: req.user.id || req.user._id,
          action,
          resource,
          resourceId: req.params.id || data.data?._id,
          details: `${action} ${resource}`,
          metadata: {
            method: req.method,
            path: req.path,
            body: sanitizeBody(req.body),
            query: req.query,
            statusCode: res.statusCode
          },
          ipAddress: clientIp,
          userAgent: req.get('user-agent'),
          status: (String(res.statusCode).startsWith('2') || data.success) ? 'success' : 'failed'
        };

        ActivityLog.create(logData).catch(err => {
          console.error('Activity log error:', err);
        });
      }
    };

    next();
  };
};

/**
 * Global Middleware to automatically log all mutations (POST, PUT, PATCH, DELETE)
 */
const globalActivityLogger = (req, res, next) => {
  // Only target data-mutating requests
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    const originalJson = res.json.bind(res);

    res.json = function (data) {
      originalJson(data);

      // If already logged by a custom logActivity above, skip. 
      if (req._activityLogged) return;

      if (req.user) {
        let action = 'update';
        if (req.method === 'POST') action = 'create';
        if (req.method === 'DELETE') action = 'delete';

        // Derive resource from path 
        const pathParts = (req.originalUrl || req.path).split('?')[0].split('/').filter(Boolean);
        let resourceRaw = 'System';
        let corePath = pathParts.find(p => !['api', 'v1', 'v2'].includes(p.toLowerCase()) && !/^[0-9a-fA-F]{24}$/.test(p));
        if (corePath) resourceRaw = corePath;
        
        let resource = resourceRaw.charAt(0).toUpperCase() + resourceRaw.slice(1);
        if (resource.endsWith('s')) {
            resource = resource.slice(0, -1);
        }

        let pastAction = action === 'create' ? 'Created' : action === 'update' ? 'Updated' : action === 'delete' ? 'Deleted' : 'Modified';
        
        const payloadData = data?.data || {};
        let descriptor = '';
        const affectedId = req.params?.id || payloadData._id || payloadData.id || req.body?.id || '';
        
        if (payloadData.deletedStudentNames && payloadData.deletedStudentNames.length > 0) {
            descriptor = `Students: ${payloadData.deletedStudentNames.join(', ')}`;
            if (payloadData.deletedVoucherNumbers && payloadData.deletedVoucherNumbers.length > 0) {
                descriptor += ` (Vouchers: ${payloadData.deletedVoucherNumbers.join(', ')})`;
            }
        } else if (Array.isArray(payloadData)) {
            descriptor = `${payloadData.length} records`; 
        } else if (typeof payloadData === 'object' && payloadData !== null) {
            descriptor = payloadData.name || payloadData.title || payloadData.firstName || payloadData.enrollmentNumber || payloadData.voucherNumber || payloadData.bankName || payloadData.email || payloadData.username || req.body?.name || req.body?.title || req.body?.voucherNumber || '';
            if (!descriptor && Object.keys(payloadData).length > 0) {
                const keys = Object.keys(payloadData).filter(k => !['_id', '__v', 'createdAt', 'updatedAt'].includes(k)).slice(0, 3);
                if (keys.length > 0) {
                    descriptor = keys.map(k => `${k}: ${payloadData[k]}`).join(', ');
                }
            }
        } else if (typeof payloadData === 'string' && payloadData.length < 50) {
            descriptor = payloadData;
        }
        
        if (!descriptor && req.body) {
            if (req.body.studentId) descriptor = `Student ref: ${String(req.body.studentId).substring(0,8)}`;
            else if (req.body.role) descriptor = `Role: ${req.body.role}`;
        }

        if (typeof descriptor === 'object' || Array.isArray(descriptor)) {
            descriptor = ''; 
        } else if (typeof descriptor !== 'string') {
            descriptor = String(descriptor);
        }
        
        let details = `${pastAction} ${resource}`;
        
        if (affectedId && !/^[0-9a-fA-F]{24}$/.test(affectedId)) {
            details += ` (ID: ${affectedId})`;
        }

        if (descriptor) {
            details += ` - ${descriptor}`;
        }

        let clientIp = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.socket?.remoteAddress || req.ip || 'Unknown';
        if (clientIp === '::1') clientIp = '127.0.0.1';
        else if (clientIp.startsWith('::ffff:')) clientIp = clientIp.replace('::ffff:', '');

        const logData = {
          user: req.user.id || req.user._id,
          action,
          resource,
          resourceId: affectedId || null,
          details: details,
          metadata: {
            method: req.method,
            path: req.path,
            body: sanitizeBody(req.body),
            query: req.query,
            statusCode: res.statusCode
          },
          ipAddress: clientIp,
          userAgent: req.get('user-agent'),
          status: String(res.statusCode).startsWith('2') ? 'success' : 'failed'
        };

        // Don't auto-log purely GET/login paths that might have slipped through
        if (!req.path.includes('/login')) {
          ActivityLog.create(logData).catch(err => console.error('Auto Activity log error:', err));
        }
      }
    };
  }
  next();
};

/**
 * Remove sensitive data from body
 */
const sanitizeBody = (body) => {
  if (!body) return {};

  const sanitized = { ...body };
  const sensitiveFields = ['password', 'currentPassword', 'newPassword', 'token', 'secret'];

  sensitiveFields.forEach(field => {
    if (sanitized[field]) {
      sanitized[field] = '[REDACTED]';
    }
  });

  return sanitized;
};

/**
 * Manual activity logging function
 */
const createActivityLog = async (userId, action, resource, details, metadata = {}) => {
  try {
    await ActivityLog.create({
      user: userId,
      action,
      resource,
      details,
      metadata,
      status: 'success'
    });
  } catch (error) {
    console.error('Activity log error:', error);
  }
};

module.exports = {
  logActivity,
  createActivityLog,
  globalActivityLogger
};
