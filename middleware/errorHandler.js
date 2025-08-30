const winston = require('winston');

const logger = winston.createLogger({
  level: 'error',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console()
  ]
});

const errorHandler = (err, req, res, next) => {
  logger.error(`Error: ${err.message}`, {
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip
  });

  // Binance API specific errors
  if (err.response && err.response.data) {
    return res.status(err.response.status || 500).json({
      error: 'Binance API Error',
      message: err.response.data.msg || err.message,
      code: err.response.data.code || 'UNKNOWN_ERROR',
      timestamp: new Date().toISOString()
    });
  }

  // Network errors
  if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND') {
    return res.status(503).json({
      error: 'Service Unavailable',
      message: 'Unable to connect to Binance API',
      code: 'CONNECTION_ERROR',
      timestamp: new Date().toISOString()
    });
  }

  // Default error response
  res.status(err.status || 500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'production' ? 'Something went wrong' : err.message,
    timestamp: new Date().toISOString()
  });
};

const notFound = (req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Endpoint ${req.method} ${req.originalUrl} not found`,
    availableEndpoints: [
      'GET /health',
      'GET /status',
      'GET /binance/api/v3/account',
      'POST /binance/sapi/v1/capital/withdraw/apply',
      'GET /binance/sapi/v1/capital/withdraw/history',
      'GET /binance/api/v3/ticker/price',
      'GET /binance/api/v3/exchangeInfo'
    ],
    timestamp: new Date().toISOString()
  });
};

module.exports = {
  errorHandler,
  notFound
};
