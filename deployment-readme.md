# TradingView to MEXC Webhook Server

This server receives webhooks from TradingView and executes trades on MEXC with low latency.

## Setup Instructions

### Prerequisites
- Node.js 16+ installed
- MEXC API keys (with trading permissions)
- Server with public internet access

### Installation

1. Clone the repository or create the files as shown above
2. Install dependencies:
   ```
   npm install
   ```
3. Create a `.env` file using the template in `env-config.txt`:
   ```
   cp env-config.txt .env
   ```
4. Update the `.env` file with your MEXC API credentials and webhook secret

### Running the Server

#### Development
```
npm run dev
```

#### Production
For production deployment, use PM2 to ensure the server stays running:

```
npm install -g pm2
pm2 start ecosystem.config.js
pm2 save
```

Create an `ecosystem.config.js` file for PM2:

```javascript
module.exports = {
  apps: [{
    name: "trading-webhook",
    script: "trading-webhook-server.js",
    instances: 2,
    exec_mode: "cluster",
    env: {
      NODE_ENV: "production",
    },
    node_args: "--max-old-space-size=4096",
    exp_backoff_restart_delay: 100
  }]
};
```

### TradingView Alert Setup

1. In TradingView, create a new alert
2. Set the alert conditions based on your strategy
3. In the "Alert message" section, use the JSON template provided:

```json
{
  "symbol": "BTCUSDT",
  "side": "buy",
  "quantity": "0.001",
  "price": "50000", 
  "type": "LIMIT",
  "strategy": "MA Crossover",
  "timestamp": "{{timenow}}",
  "message": "Buy signal: Moving average crossover detected"
}
```

4. Set webhook URL to your server's endpoint: `https://your-server.com/webhook/tradingview`
5. Add a custom header: `x-tv-signature: {{signature}}`

Note: The signature header is critical for security. You'll need to implement a way to generate this signature in TradingView or use a proxy service.

### Setting Up Signature Validation

The webhook server verifies each request using HMAC-SHA256 signatures. To set up proper signature validation:

1. Set a strong random string as your `WEBHOOK_SECRET` in the `.env` file
2. For TradingView alerts, you'll need to generate the signature as follows:
   - Generate HMAC-SHA256 of the JSON payload using your webhook secret
   - Add the signature as a custom header: `x-tv-signature: [your-generated-signature]`

Since TradingView doesn't directly support custom signatures, you have two options:
1. Use a proxy service that adds this header
2. Use a third-party service like Zapier, n8n, or a custom serverless function

## Multiple Trading Strategies

The server supports multiple trading strategies by:

1. Specifying the strategy name in the webhook payload
2. Configuring strategy-specific parameters in your `.env` file:

```
STRATEGY_MA_CROSSOVER_PARAMS={"timeInForce":"GTC"}
STRATEGY_RSI_STRATEGY_PARAMS={"timeInForce":"IOC"}
```

These parameters will be automatically applied based on the strategy name in the webhook.

## Optimizing for Low Latency

For the lowest possible latency:

1. **Server Location**: Deploy your server in a data center close to MEXC's servers (ideally in the same region)
2. **Network Optimization**: 
   - Use a VPS with optimized networking
   - Consider a dedicated server rather than shared hosting
   - Use a provider with good peering to MEXC's infrastructure
3. **Resource Allocation**: 
   - Ensure adequate CPU/RAM (at least 2 vCPUs and 4GB RAM)
   - Consider using machines with high clock speeds rather than many cores
4. **OS Tuning**: Adjust TCP settings for low latency networking:
   ```bash
   # Add to /etc/sysctl.conf
   net.ipv4.tcp_fastopen = 3
   net.ipv4.tcp_low_latency = 1
   net.ipv4.tcp_rmem = 4096 87380 16777216
   net.ipv4.tcp_wmem = 4096 65536 16777216
   ```
5. **Application Configuration**:
   - Adjust MAX_RETRIES and RETRY_DELAY in .env for optimal balance
   - Set appropriate MEXC_API_TIMEOUT value based on observed latency
6. **Monitoring**: Set up monitoring for both server performance and trade execution latency
   - Use the `/status` endpoint to check server health
   - Review latency metrics in logs

## Error Handling and Reliability

The server includes comprehensive error handling:

1. **Request Tracking**: Each request gets a unique ID for tracking through logs
2. **Retry Mechanism**: Failed API calls are automatically retried with exponential backoff
3. **Rate Limiting**: Protects against abuse and excessive requests
4. **Graceful Shutdown**: Handles process termination properly
5. **Structured Logging**: JSON-formatted logs for easy analysis

## Security Considerations

1. Always use HTTPS for your webhook endpoint
2. Use a strong WEBHOOK_SECRET value
3. Regularly rotate your MEXC API keys
4. Consider using IP whitelisting for TradingView's webhook IPs
5. Monitor for unusual trading patterns
6. Set appropriate rate limits for your API
7. Consider network-level protection (e.g., Cloudflare, AWS WAF)

## Troubleshooting

The server includes comprehensive error logging. Check the following files for troubleshooting:
- `error.log`: Contains only error messages
- `combined.log`: Contains all log messages

Common issues:
1. **Signature Validation Errors**: Check that your webhook secret matches between TradingView and the server
2. **API Request Timeouts**: Check network connectivity to MEXC or increase timeout value
3. **Invalid Trading Parameters**: Verify symbol names and order parameters are correct
