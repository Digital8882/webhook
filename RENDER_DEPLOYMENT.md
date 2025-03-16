# Deploying the TradingView to MEXC Webhook Server on Render.com

This guide will help you deploy your webhook server to Render.com so it can receive webhooks from TradingView and execute trades on MEXC.

## Step 1: Create a Render Account

1. Go to [render.com](https://render.com) and sign up for an account if you don't have one.
2. Verify your email address and log in.

## Step 2: Connect Your GitHub Repository

1. Push your code to a GitHub repository (private or public).
2. In the Render dashboard, click "New" and select "Web Service".
3. Connect your GitHub account if prompted.
4. Select the repository containing your webhook server code.

## Step 3: Configure the Web Service

1. Fill in the following settings:
   - **Name**: `tradingview-mexc-webhook` (or any name you prefer)
   - **Environment**: `Node`
   - **Region**: Choose the region closest to MEXC's servers for lower latency
   - **Branch**: `main` (or your default branch)
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plan**: Free (or select a paid plan for better performance)

2. Click "Advanced" and add the following environment variables:
   - `NODE_ENV`: `production`
   - `WEBHOOK_SECRET`: Your secret key for validating webhooks
   - `MEXC_API_KEY`: Your MEXC API key
   - `MEXC_API_SECRET`: Your MEXC API secret
   - Optionally add any other environment variables from your `.env` file
   
   Note: Mark the API keys and secrets as "Secret" by toggling the option.

3. Click "Create Web Service".

## Step 4: Wait for Deployment

Render will now build and deploy your service. This may take a few minutes.

## Step 5: Get Your Webhook URL

Once deployed, you'll get a URL like `https://tradingview-mexc-webhook.onrender.com`.

Your webhook endpoint will be:
```
https://tradingview-mexc-webhook.onrender.com/webhook/tradingview
```

## Step 6: Configure TradingView Alert

In TradingView:

1. Create an alert for your strategy
2. Set the Webhook URL to your Render URL from Step 5
3. Add the custom header:
   ```
   x-tv-signature: {{signature}}
   ```
4. For the message, use the JSON format:
   ```json
   {
     "symbol": "BTCUSDT",
     "side": "{{strategy.order.action}}",
     "quantity": "0.001",
     "price": "{{close}}",
     "type": "LIMIT",
     "strategy": "MA_CROSSOVER",
     "timestamp": "{{timenow}}",
     "message": "Signal from TradingView"
   }
   ```

## Step 7: Verify Deployment

1. Check your server logs in the Render dashboard
2. Use the test-webhook.js script to test your deployment
3. Update the WEBHOOK_URL in test-webhook.js to your new Render URL:
   ```javascript
   const WEBHOOK_URL = `https://tradingview-mexc-webhook.onrender.com/webhook/tradingview`;
   ```

## Step 8: Monitoring

Render provides easy access to logs and metrics. Check them regularly to ensure your webhook server is running properly.

## Important Notes

1. The free plan on Render has limitations:
   - Services on the free plan will spin down after 15 minutes of inactivity.
   - There might be a delay when receiving the first webhook after inactivity.
   - Consider upgrading to a paid plan for production use.

2. Make sure to secure your API keys and secrets:
   - Never commit them to Git repositories
   - Use environment variables on Render
   - Regularly rotate your API keys

3. Configure rate limiting appropriately:
   - The default configuration allows 30 requests per minute
   - Adjust based on your strategy's requirements 