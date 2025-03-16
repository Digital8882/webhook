// signature-generator.js - Helper script to generate webhook signatures for TradingView
const crypto = require('crypto');
const dotenv = require('dotenv');

// Load environment variables to get the webhook secret
dotenv.config();

// Read the webhook secret from .env
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || 'your_webhook_secret_key_here';

// Sample TradingView alert payload - this should match your TradingView alert
const samplePayload = {
  "symbol": "BTCUSDT",
  "side": "buy", // or "sell" - this will be replaced by TradingView's {{strategy.order.action}}
  "quantity": "0.001",
  "price": "50000", // This will be replaced by TradingView's {{close}}
  "type": "LIMIT",
  "strategy": "MA_CROSSOVER",
  "timestamp": new Date().toISOString(), // This will be replaced by TradingView's {{timenow}}
  "message": "Buy signal from TradingView" // This will be replaced by TradingView's {{strategy.order.comment}}
};

// Generate the HMAC signature
const generateSignature = (payload, secret) => {
  const hmac = crypto.createHmac('sha256', secret);
  return hmac.update(JSON.stringify(payload)).digest('hex');
};

// Generate the signature
const signature = generateSignature(samplePayload, WEBHOOK_SECRET);

// Print the result
console.log("\n=============================================");
console.log("  TradingView Webhook Signature Generator");
console.log("=============================================\n");
console.log("Using webhook secret:", WEBHOOK_SECRET);
console.log("\nSample payload:");
console.log(JSON.stringify(samplePayload, null, 2));
console.log("\nGenerated signature:");
console.log(signature);
console.log("\n---------------------------------------------");
console.log("IMPORTANT: This is just a sample signature for testing.");
console.log("TradingView will replace the placeholder values with real data,");
console.log("so the actual signature will be different for each alert.");
console.log("---------------------------------------------\n");
console.log("Instructions:");
console.log("1. In TradingView alert, add this custom header:");
console.log(`   x-tv-signature: ${signature}`);
console.log("2. Use this for testing with the given sample payload.");
console.log("3. For production, you'll need a proxy service that can");
console.log("   dynamically calculate signatures for TradingView alerts.");
console.log("=============================================\n");

// Optional: for proxy services or middleware to dynamically calculate signatures
console.log("For developers: Here's how to calculate signatures in different languages:\n");
console.log("Node.js:");
console.log(`
const crypto = require('crypto');
const payload = JSON.stringify(data);
const signature = crypto
  .createHmac('sha256', '${WEBHOOK_SECRET}')
  .update(payload)
  .digest('hex');
`);

console.log("Python:");
console.log(`
import hmac
import hashlib
import json

payload = json.dumps(data)
signature = hmac.new(
  '${WEBHOOK_SECRET}'.encode('utf-8'),
  payload.encode('utf-8'),
  hashlib.sha256
).hexdigest()
`); 