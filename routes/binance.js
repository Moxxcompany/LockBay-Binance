const express = require('express');
const { body, query, validationResult } = require('express-validator');
const BinanceAuth = require('../utils/binanceAuth');

const router = express.Router();
const binance = new BinanceAuth();

// Validation middleware
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation Error',
      details: errors.array(),
      timestamp: new Date().toISOString()
    });
  }
  next();
};

/**
 * GET /api/v3/account - Get account information
 * Required for wallet balance checking in LockBay
 */
router.get('/api/v3/account', async (req, res, next) => {
  try {
    console.log('📊 Fetching account information...');
    const result = await binance.makeRequest('GET', '/api/v3/account');
    
    res.status(200).json({
      success: true,
      data: result.data,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v3/ticker/price - Get current prices
 * Required for exchange rate calculations
 */
router.get('/api/v3/ticker/price', [
  query('symbol').optional().isString().trim()
], handleValidationErrors, async (req, res, next) => {
  try {
    const { symbol } = req.query;
    console.log(`💰 Fetching price data${symbol ? ' for ' + symbol : ''}...`);
    
    const params = symbol ? { symbol: symbol.toUpperCase() } : {};
    const result = await binance.makeRequest('GET', '/api/v3/ticker/price', params, false);
    
    res.status(200).json({
      success: true,
      data: result.data,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v3/exchangeInfo - Get exchange information
 * Required for validating trading pairs and limits
 */
router.get('/api/v3/exchangeInfo', [
  query('symbol').optional().isString().trim()
], handleValidationErrors, async (req, res, next) => {
  try {
    const { symbol } = req.query;
    console.log(`ℹ️ Fetching exchange info${symbol ? ' for ' + symbol : ''}...`);
    
    const params = symbol ? { symbol: symbol.toUpperCase() } : {};
    const result = await binance.makeRequest('GET', '/api/v3/exchangeInfo', params, false);
    
    res.status(200).json({
      success: true,
      data: result.data,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /sapi/v1/capital/withdraw/apply - Submit withdrawal request
 * Core functionality for LockBay crypto withdrawals
 */
router.post('/sapi/v1/capital/withdraw/apply', [
  body('coin').isString().trim().isLength({ min: 2, max: 10 }),
  body('address').isString().trim().isLength({ min: 10 }),
  body('amount').isNumeric().custom(value => {
    if (parseFloat(value) <= 0) {
      throw new Error('Amount must be greater than 0');
    }
    return true;
  }),
  body('network').optional().isString().trim(),
  body('addressTag').optional().isString().trim(),
  body('name').optional().isString().trim()
], handleValidationErrors, async (req, res, next) => {
  try {
    const { coin, address, amount, network, addressTag, name } = req.body;
    
    console.log(`💸 Processing withdrawal: ${amount} ${coin} to ${address.substring(0, 10)}...`);
    
    const params = {
      coin: coin.toUpperCase(),
      address,
      amount: parseFloat(amount)
    };
    
    // Add optional parameters
    if (network) params.network = network.toUpperCase();
    if (addressTag) params.addressTag = addressTag;
    if (name) params.name = name;
    
    const result = await binance.makeRequest('POST', '/sapi/v1/capital/withdraw/apply', params);
    
    console.log(`✅ Withdrawal submitted successfully: ID ${result.data.id}`);
    
    res.status(200).json({
      success: true,
      data: result.data,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Withdrawal failed:', error);
    next(error);
  }
});

/**
 * GET /sapi/v1/capital/withdraw/history - Get withdrawal history
 * Required for tracking withdrawal statuses in LockBay
 */
router.get('/sapi/v1/capital/withdraw/history', [
  query('coin').optional().isString().trim(),
  query('withdrawOrderId').optional().isString().trim(),
  query('status').optional().isInt({ min: 0, max: 6 }),
  query('startTime').optional().isInt(),
  query('endTime').optional().isInt(),
  query('offset').optional().isInt({ min: 0 }),
  query('limit').optional().isInt({ min: 1, max: 1000 })
], handleValidationErrors, async (req, res, next) => {
  try {
    const params = {};
    
    // Add query parameters if provided
    ['coin', 'withdrawOrderId', 'status', 'startTime', 'endTime', 'offset', 'limit'].forEach(param => {
      if (req.query[param]) {
        params[param] = param === 'coin' ? req.query[param].toUpperCase() : req.query[param];
      }
    });
    
    console.log('📋 Fetching withdrawal history...');
    const result = await binance.makeRequest('GET', '/sapi/v1/capital/withdraw/history', params);
    
    res.status(200).json({
      success: true,
      data: result.data,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /sapi/v1/capital/deposit/hisrec - Get deposit history
 * Required for tracking deposit confirmations
 */
router.get('/sapi/v1/capital/deposit/hisrec', [
  query('coin').optional().isString().trim(),
  query('status').optional().isInt({ min: 0, max: 6 }),
  query('startTime').optional().isInt(),
  query('endTime').optional().isInt(),
  query('offset').optional().isInt({ min: 0 }),
  query('limit').optional().isInt({ min: 1, max: 1000 })
], handleValidationErrors, async (req, res, next) => {
  try {
    const params = {};
    
    ['coin', 'status', 'startTime', 'endTime', 'offset', 'limit'].forEach(param => {
      if (req.query[param]) {
        params[param] = param === 'coin' ? req.query[param].toUpperCase() : req.query[param];
      }
    });
    
    console.log('📥 Fetching deposit history...');
    const result = await binance.makeRequest('GET', '/sapi/v1/capital/deposit/hisrec', params);
    
    res.status(200).json({
      success: true,
      data: result.data,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /sapi/v1/capital/deposit/address - Get deposit address
 * Required for generating deposit addresses
 */
router.get('/sapi/v1/capital/deposit/address', [
  query('coin').isString().trim().isLength({ min: 2, max: 10 }),
  query('network').optional().isString().trim()
], handleValidationErrors, async (req, res, next) => {
  try {
    const { coin, network } = req.query;
    
    const params = { coin: coin.toUpperCase() };
    if (network) params.network = network.toUpperCase();
    
    console.log(`🏦 Fetching deposit address for ${coin}...`);
    const result = await binance.makeRequest('GET', '/sapi/v1/capital/deposit/address', params);
    
    res.status(200).json({
      success: true,
      data: result.data,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /sapi/v1/capital/config/getall - Get all coin information
 * Required for supported coins and network information
 */
router.get('/sapi/v1/capital/config/getall', async (req, res, next) => {
  try {
    console.log('🪙 Fetching all coin configuration...');
    const result = await binance.makeRequest('GET', '/sapi/v1/capital/config/getall');
    
    res.status(200).json({
      success: true,
      data: result.data,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v3/time - Get server time
 * Utility endpoint for time synchronization
 */
router.get('/api/v3/time', async (req, res, next) => {
  try {
    console.log('⏰ Fetching server time...');
    const result = await binance.makeRequest('GET', '/api/v3/time', {}, false);
    
    res.status(200).json({
      success: true,
      data: result.data,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /test-credentials - Test API credentials
 * Utility endpoint for validating Binance API setup
 */
router.post('/test-credentials', async (req, res, next) => {
  try {
    console.log('🔐 Testing Binance API credentials...');
    const result = await binance.testCredentials();
    
    if (result.valid) {
      res.status(200).json({
        success: true,
        message: 'Credentials are valid',
        data: {
          accountType: result.accountType,
          permissions: result.permissions
        },
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(401).json({
        success: false,
        message: 'Invalid credentials',
        error: result.error,
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    next(error);
  }
});

module.exports = router;
