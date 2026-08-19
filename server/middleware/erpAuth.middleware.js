/**
 * ERP API Key Authentication Middleware
 * Validates API key provided in headers for external ERP system integration.
 */
const erpAuthMiddleware = (req, res, next) => {
  const apiKeyHeader = req.headers['x-api-key'] || req.headers['x-erp-api-key'] || req.headers['authorization'];
  
  let apiKey = apiKeyHeader;
  if (apiKeyHeader && apiKeyHeader.startsWith('Bearer ')) {
    apiKey = apiKeyHeader.substring(7).trim();
  }

  const validApiKey = process.env.ERP_API_KEY || 'sgc_erp_secret_key_2026';

  if (!apiKey || apiKey !== validApiKey) {
    return res.status(401).json({
      success: false,
      message: 'Unauthorized. Invalid or missing ERP API Key.'
    });
  }

  next();
};

module.exports = erpAuthMiddleware;
