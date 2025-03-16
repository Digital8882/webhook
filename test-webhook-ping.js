// test-webhook-ping.js - Script to test if the webhook server is properly receiving requests
const axios = require('axios');
const crypto = require('crypto');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Configuration
const RENDER_WEBHOOK_URL = `https://tradingview-mexc-webhook.onrender.com/webhook/tradingview`;
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || 'your_webhook_secret_key_here';

// Simple ping payload - just for testing connectivity
const payload = {
  ping: true,
  timestamp: new Date().toISOString(),
  message: "Ping test - please log but don't execute trade"
};

// Generate signature
const generateSignature = (payload, secret) => {
  const hmac = crypto.createHmac('sha256', secret);
  return hmac.update(JSON.stringify(payload)).digest('hex');
};

const signature = generateSignature(payload, WEBHOOK_SECRET);

// Send test webhook
const sendTestPing = async () => {
  try {
    console.log('Sending ping to webhook:', RENDER_WEBHOOK_URL);
    console.log('Payload:', JSON.stringify(payload, null, 2));
    console.log('Signature:', signature);
    console.log('Secret length:', WEBHOOK_SECRET.length);
    
    const startTime = Date.now();
    
    const response = await axios({
      method: 'POST',
      url: RENDER_WEBHOOK_URL,
      headers: {
        'Content-Type': 'application/json',
        'x-tv-signature': signature,
        'User-Agent': 'TradingView-Ping-Test'
      },
      data: payload
    });
    
    const latency = Date.now() - startTime;
    
    console.log('Webhook response:', JSON.stringify(response.data, null, 2));
    console.log(`Total round-trip latency: ${latency}ms`);
    
  } catch (error) {
    console.error('Error sending webhook ping:');
    
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    } else {
      console.error(error.message);
    }
  }
};

// Run the test
sendTestPing(); 