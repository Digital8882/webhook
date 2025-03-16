@echo off
echo Starting TradingView to MEXC Webhook Server...
echo This script needs to be run as Administrator to bind to port 80.

REM Set NODE_ENV to production
set NODE_ENV=production

REM Start the server
node trading-webhook-server.js

pause 