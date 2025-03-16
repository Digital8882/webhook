// server.js - Main entry point for webhook server
const express = require('express');
const bodyParser = require('body-parser');
const crypto = require('crypto');
const axios = require('axios');
const dotenv = require('dotenv');
const winston = require('winston');
const rateLimit = require('express-rate-limit');
const { performance } = require('perf_hooks');

// Load environment variables
dotenv.config();

// Configure logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
    new winston.transports.Console({ 
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ) 
    })
  ]
});

// Initialize Express app
const app = express();

// Configure to trust proxy (needed for Render.com and other PaaS platforms)
app.set('trust proxy', 1);

// Add request ID middleware for better log tracking
app.use((req, res, next) => {
  req.id = crypto.randomBytes(16).toString('hex');
  res.setHeader('X-Request-ID', req.id);
  next();
});

// Configure rate limiting
const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30, // limit each IP to 30 requests per windowMs
  message: 'Too many requests from this IP, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply rate limiting to webhook endpoint
app.use('/webhook', apiLimiter);

// Middleware for parsing JSON with increased size limit for larger payloads
app.use(bodyParser.json({ limit: '1mb' }));

// MEXC API configuration
const MEXC_API_BASE_URL = 'https://api.mexc.com';
const MEXC_API_TIMEOUT = parseInt(process.env.MEXC_API_TIMEOUT || '5000', 10); // 5 seconds default

// Verify webhook signature
const verifySignature = (req, res, next) => {
  const signature = req.headers['x-tv-signature'];
  const payload = JSON.stringify(req.body);
  const webhookSecret = process.env.WEBHOOK_SECRET || '';
  
  if (!signature) {
    logger.error({ requestId: req.id, message: 'Missing signature header' });
    return res.status(401).json({ error: 'Missing signature header' });
  }
  
  const hmac = crypto.createHmac('sha256', webhookSecret);
  const computedSignature = hmac.update(payload).digest('hex');
  
  logger.debug({
    requestId: req.id,
    message: 'Verifying signature',
    receivedSignature: signature.substring(0, 10) + '...',
    computedSignaturePrefix: computedSignature.substring(0, 10) + '...',
    signatureMatch: signature === computedSignature
  });
  
  if (signature !== computedSignature) {
    logger.error({ 
      requestId: req.id, 
      message: 'Invalid signature',
      receivedSignature: signature.substring(0, 10) + '...',
      computedSignaturePrefix: computedSignature.substring(0, 10) + '...',
      webhookSecretLength: webhookSecret.length
    });
    return res.status(401).json({ error: 'Invalid signature' });
  }
  
  next();
};

// Generate MEXC signature
const generateMEXCSignature = (params, secret) => {
  // Ensure all parameters are properly encoded
  const sortedParams = Object.keys(params)
    .sort()
    .reduce((result, key) => {
      result[key] = params[key];
      return result;
    }, {});
  
  const queryString = Object.entries(sortedParams)
    .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
    .join('&');
  
  return crypto
    .createHmac('sha256', secret)
    .update(queryString)
    .digest('hex');
};

// Execute trade on MEXC with retry mechanism
const executeMEXCTrade = async (tradeData, requestId, retryCount = 0) => {
  const maxRetries = parseInt(process.env.MAX_RETRIES || '3', 10);
  const retryDelay = parseInt(process.env.RETRY_DELAY || '500', 10); // 500ms default
  
  try {
    const { symbol, side, quantity, price, type, strategy } = tradeData;
    const timestamp = Date.now();
    
    const params = {
      symbol,
      side: side.toUpperCase(),
      type: type || 'LIMIT',
      quantity,
      timestamp,
      recvWindow: 5000 // Add recvWindow parameter to avoid timestamp issues
    };
    
    // Add price for limit orders
    if (params.type === 'LIMIT' && price) {
      params.price = price;
    }
    
    // Apply strategy-specific parameters if needed
    if (strategy && process.env[`STRATEGY_${strategy.toUpperCase()}_PARAMS`]) {
      const strategyParams = JSON.parse(process.env[`STRATEGY_${strategy.toUpperCase()}_PARAMS`]);
      Object.assign(params, strategyParams);
    }
    
    const signature = generateMEXCSignature(params, process.env.MEXC_API_SECRET);
    params.signature = signature;
    
    const startTime = performance.now();
    
    const response = await axios({
      method: 'POST',
      url: `${MEXC_API_BASE_URL}/api/v3/order`,
      headers: {
        'X-MEXC-APIKEY': process.env.MEXC_API_KEY,
        'Content-Type': 'application/json'
      },
      params,
      timeout: MEXC_API_TIMEOUT
    });
    
    const latency = (performance.now() - startTime).toFixed(2);
    
    logger.info({
      requestId,
      message: 'Trade executed successfully',
      data: response.data,
      latency: `${latency}ms`,
      symbol,
      side,
      strategy
    });
    
    return {
      success: true,
      data: response.data,
      latency
    };
  } catch (error) {
    // Handle specific error cases
    if (error.code === 'ECONNABORTED') {
      logger.error({
        requestId,
        message: 'MEXC API request timeout',
        error: error.message,
        tradeData
      });
      
      // Retry on timeout if within retry limit
      if (retryCount < maxRetries) {
        logger.info({
          requestId,
          message: `Retrying trade execution (${retryCount + 1}/${maxRetries})`,
          tradeData
        });
        
        await new Promise(resolve => setTimeout(resolve, retryDelay));
        return executeMEXCTrade(tradeData, requestId, retryCount + 1);
      }
    }
    
    logger.error({
      requestId,
      message: 'Trade execution failed',
      error: error.message,
      tradeData
    });
    
    if (error.response) {
      logger.error({
        requestId,
        message: 'MEXC API response error',
        data: error.response.data,
        status: error.response.status
      });
      
      // Retry on signature errors (code 700002) if within retry limit
      if (error.response.data && 
          error.response.data.code === 700002 && 
          retryCount < maxRetries) {
        logger.info({
          requestId,
          message: `Retrying trade execution after signature error (${retryCount + 1}/${maxRetries})`,
          tradeData
        });
        
        await new Promise(resolve => setTimeout(resolve, retryDelay));
        return executeMEXCTrade(tradeData, requestId, retryCount + 1);
      }
    }
    
    throw error;
  }
};

// Webhook endpoint for TradingView alerts
app.post('/webhook/tradingview', verifySignature, async (req, res) => {
  const startTime = performance.now();
  
  try {
    logger.info({
      requestId: req.id,
      message: 'Received webhook',
      payload: req.body,
      headers: {
        'x-forwarded-for': req.headers['x-forwarded-for'],
        'user-agent': req.headers['user-agent']
      }
    });
    
    // Process TradingView webhook payload
    const { symbol, side, quantity, price, type, strategy } = req.body;
    
    // Validate required fields
    if (!symbol || !side || !quantity) {
      logger.error({
        requestId: req.id,
        message: 'Missing required fields in webhook payload',
        payload: req.body
      });
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Execute trade on MEXC
    const tradeResult = await executeMEXCTrade({
      symbol,
      side,
      quantity,
      price,
      type,
      strategy
    }, req.id);
    
    const processingTime = (performance.now() - startTime).toFixed(2);
    
    logger.info({
      requestId: req.id,
      message: 'Webhook processed successfully',
      processingTime: `${processingTime}ms`
    });
    
    return res.status(200).json({
      success: true,
      message: 'Trade executed successfully',
      data: tradeResult.data,
      latency: {
        total: `${processingTime}ms`,
        mexcApi: tradeResult.latency
      },
      requestId: req.id
    });
  } catch (error) {
    const processingTime = (performance.now() - startTime).toFixed(2);
    
    logger.error({
      requestId: req.id,
      message: 'Error processing webhook',
      error: error.message,
      processingTime: `${processingTime}ms`
    });
    
    return res.status(500).json({
      success: false,
      message: 'Failed to process webhook',
      error: error.message,
      requestId: req.id
    });
  }
});

// Endpoint to get server status and statistics
app.get('/status', (req, res) => {
  res.status(200).json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: Date.now(),
    version: process.env.VERSION || '1.0.0'
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Error handling for unhandled routes
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Global error handler
app.use((err, req, res, next) => {
  logger.error({
    requestId: req.id || 'unknown',
    message: 'Unhandled error',
    error: err.message,
    stack: err.stack
  });
  
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    requestId: req.id || 'unknown'
  });
});

// Start server
const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM signal received. Shutting down gracefully');
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

module.exports = app;
