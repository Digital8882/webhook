// test-webhook.js - Script to test the webhook server
const axios = require('axios');
const crypto = require('crypto');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Configuration
// For local testing
const LOCAL_WEBHOOK_URL = `http://localhost:${process.env.PORT || 3000}/webhook/tradingview`;
// For render.com deployment
const RENDER_WEBHOOK_URL = `https://your-render-app-name.onrender.com/webhook/tradingview`;

// Choose which URL to use - set to true for render deployment
const USE_RENDER = false;
const WEBHOOK_URL = USE_RENDER ? RENDER_WEBHOOK_URL : LOCAL_WEBHOOK_URL;

const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || 'your_webhook_secret_key_here';

// Sample trade payload
const payload = {
  symbol: "BTCUSDT",
  side: "buy",
  quantity: "0.001",
  price: "50000",
  type: "LIMIT",
  strategy: "MA_CROSSOVER",
  timestamp: new Date().toISOString(),
  message: "Buy signal: Moving average crossover detected"
};

// Generate signature
const generateSignature = (payload, secret) => {
  const hmac = crypto.createHmac('sha256', secret);
  return hmac.update(JSON.stringify(payload)).digest('hex');
};

const signature = generateSignature(payload, WEBHOOK_SECRET);

// Send test webhook
const sendTestWebhook = async () => {
  try {
    console.log('Sending test webhook to:', WEBHOOK_URL);
    console.log('Payload:', JSON.stringify(payload, null, 2));
    console.log('Signature:', signature);
    
    const startTime = Date.now();
    
    const response = await axios({
      method: 'POST',
      url: WEBHOOK_URL,
      headers: {
        'Content-Type': 'application/json',
        'x-tv-signature': signature
      },
      data: payload
    });
    
    const latency = Date.now() - startTime;
    
    console.log('Webhook response:', JSON.stringify(response.data, null, 2));
    console.log(`Total round-trip latency: ${latency}ms`);
    
  } catch (error) {
    console.error('Error sending webhook:');
    
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    } else {
      console.error(error.message);
    }
  }
};

// Run the test
sendTestWebhook(); 