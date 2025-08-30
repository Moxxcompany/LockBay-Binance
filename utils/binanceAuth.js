const crypto = require('crypto');
const axios = require('axios');

class BinanceAuth {
  constructor() {
    this.apiKey = process.env.BINANCE_API_KEY;
    this.apiSecret = process.env.BINANCE_API_SECRET;
    this.baseURL = process.env.BINANCE_BASE_URL || 'https://api.binance.com';
    
    if (!this.apiKey || !this.apiSecret) {
      throw new Error('Binance API credentials not found in environment variables');
    }
  }

  /**
   * Generate HMAC SHA256 signature for Binance API
   */
  generateSignature(queryString) {
    return crypto
      .createHmac('sha256', this.apiSecret)
      .update(queryString)
      .digest('hex');
  }

  /**
   * Create signed request parameters
   */
  createSignedParams(params = {}) {
    // Add timestamp
    params.timestamp = Date.now();
    
    // Create query string
    const queryString = Object.keys(params)
      .sort()
      .map(key => `${key}=${encodeURIComponent(params[key])}`)
      .join('&');
    
    // Generate signature
    const signature = this.generateSignature(queryString);
    
    return {
      ...params,
      signature
    };
  }

  /**
   * Get request headers for Binance API
   */
  getHeaders() {
    return {
      'X-MBX-APIKEY': this.apiKey,
      'Content-Type': 'application/json',
      'User-Agent': 'LockBay-Binance-Proxy/1.0.0'
    };
  }

  /**
   * Make authenticated request to Binance API
   */
  async makeRequest(method, endpoint, params = {}, requiresSignature = true) {
    try {
      let url = `${this.baseURL}${endpoint}`;
      let data = null;
      
      if (requiresSignature) {
        params = this.createSignedParams(params);
      }
      
      const config = {
        method,
        url,
        headers: this.getHeaders(),
        timeout: 30000 // 30 seconds timeout
      };
      
      if (method.toLowerCase() === 'get') {
        // For GET requests, add params to URL
        if (Object.keys(params).length > 0) {
          const queryString = Object.keys(params)
            .map(key => `${key}=${encodeURIComponent(params[key])}`)
            .join('&');
          url += `?${queryString}`;
          config.url = url;
        }
      } else {
        // For POST/PUT/DELETE requests, add params to body
        config.data = params;
      }
      
      console.log(`🔗 Making ${method.toUpperCase()} request to: ${endpoint}`);
      const response = await axios(config);
      
      return {
        success: true,
        data: response.data,
        status: response.status
      };
      
    } catch (error) {
      console.error(`❌ Binance API Error:`, {
        endpoint,
        method,
        message: error.message,
        status: error.response?.status,
        data: error.response?.data
      });
      
      throw {
        success: false,
        error: error.response?.data || { msg: error.message },
        status: error.response?.status || 500,
        code: error.response?.data?.code || 'REQUEST_FAILED'
      };
    }
  }

  /**
   * Test API credentials
   */
  async testCredentials() {
    try {
      const result = await this.makeRequest('GET', '/api/v3/account');
      return {
        valid: true,
        accountType: result.data.accountType,
        permissions: result.data.permissions
      };
    } catch (error) {
      return {
        valid: false,
        error: error.error?.msg || 'Invalid credentials'
      };
    }
  }

  /**
   * Get server time from Binance
   */
  async getServerTime() {
    try {
      const result = await this.makeRequest('GET', '/api/v3/time', {}, false);
      return result.data;
    } catch (error) {
      throw error;
    }
  }
}

module.exports = BinanceAuth;
