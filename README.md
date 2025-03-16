# TradingView to MEXC Webhook Server

[![Node.js](https://img.shields.io/badge/Node.js-16.x-green.svg)](https://nodejs.org/)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

A high-performance, low-latency webhook server that receives trading signals from TradingView alerts and executes trades on MEXC spot trading.

## Features

- **Low Latency**: Optimized for speed with response times typically < 150ms
- **Reliability**: Automatic retry mechanism for failed API calls
- **Security**: HMAC signature validation for all incoming webhooks
- **Monitoring**: Detailed logging and performance metrics
- **Scalability**: Support for multiple trading strategies
- **Error Handling**: Comprehensive error management and reporting

## Quick Start

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/tradingview-mexc-webhook.git
   cd tradingview-mexc-webhook
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   ```bash
   cp env-config.txt .env
   # Edit .env with your MEXC API credentials
   ```

4. **Run the server**
   ```bash
   npm start
   ```

5. **Test the webhook**
   ```bash
   node test-webhook.js
   ```

## Project Structure

```
├── trading-webhook-server.js  # Main server implementation
├── package.json               # Project dependencies
├── .env                       # Environment configuration
├── ecosystem.config.js        # PM2 configuration
├── test-webhook.js            # Script to test the webhook
├── performance-test.js        # Performance testing script
├── logs/                      # Log files directory
├── README.md                  # Project documentation
└── deployment-readme.md       # Deployment instructions
```

## TradingView Setup

In TradingView, create an alert with the following configuration:

1. **Alert Condition**: Based on your strategy
2. **Alert Action**: Send a webhook
3. **Webhook URL**: `https://your-server.com/webhook/tradingview`
4. **Message Format**: JSON format as described in [tradingview-alert.json](tradingview-alert.json)
5. **Custom Header**: `x-tv-signature: {{signature}}` (you'll need to set up signature generation)

## Performance

The server is optimized for low latency:

- **Request tracking**: Each request gets a unique ID for tracing
- **Streaming response**: Responses start streaming back as soon as possible
- **Optimized API calls**: Efficient MEXC API integration
- **Connection pooling**: HTTP keep-alive for better performance
- **Rate limiting**: Protection against excessive requests

## Deployment

For production deployment, see the [deployment-readme.md](deployment-readme.md) file for detailed instructions.

## Testing

Two testing utilities are included:

1. **test-webhook.js**: Simple single webhook test
   ```bash
   node test-webhook.js
   ```

2. **performance-test.js**: Load testing tool
   ```bash
   node performance-test.js
   ```

## License

MIT License - see the [LICENSE](LICENSE) file for details.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request. 