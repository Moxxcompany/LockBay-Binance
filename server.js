const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const winston = require('winston');
require('dotenv').config();

const binanceRouter = require('./routes/binance');
const { errorHandler, notFound } = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 3000;

// Configure Winston logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});

// Security middleware
app.use(helmet());

// CORS configuration - restrict to your Replit domain
const corsOptions = {
  origin: [
    /\.replit\.dev$/,
    /\.replit\.app$/,
    process.env.ALLOWED_ORIGIN || 'http://localhost:5000'
  ],
  credentials: true,
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));

// Rate limiting - 100 requests per 15 minutes
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(limiter);

// Body parser middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path} - IP: ${req.ip}`);
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'LockBay Binance Proxy',
    version: '1.0.0'
  });
});

// API status endpoint
app.get('/status', (req, res) => {
  res.status(200).json({
    status: 'active',
    endpoints: {
      account: '/binance/api/v3/account',
      balance: '/binance/api/v3/account',
      withdraw: '/binance/sapi/v1/capital/withdraw/apply',
      withdrawHistory: '/binance/sapi/v1/capital/withdraw/history',
      prices: '/binance/api/v3/ticker/price',
      exchangeInfo: '/binance/api/v3/exchangeInfo'
    },
    timestamp: new Date().toISOString()
  });
});

// Binance API routes
app.use('/binance', binanceRouter);

// 404 handler
app.use(notFound);

// Global error handler
app.use(errorHandler);

app.listen(PORT, '0.0.0.0', () => {
  logger.info(`🚀 LockBay Binance Proxy server running on port ${PORT}`);
  logger.info(`🔐 CORS enabled for Replit domains`);
  logger.info(`⚡ Rate limiting: 100 requests per 15 minutes`);
  
  // Validate required environment variables
  const requiredVars = ['BINANCE_API_KEY', 'BINANCE_API_SECRET'];
  const missingVars = requiredVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    logger.error(`❌ Missing required environment variables: ${missingVars.join(', ')}`);
    logger.warn('🔧 Please set these variables in Railway.com dashboard');
  } else {
    logger.info('✅ All required environment variables are set');
  }
});

module.exports = app;
