// performance-test.js - Script to test the webhook server performance
const axios = require('axios');
const crypto = require('crypto');
const dotenv = require('dotenv');
const fs = require('fs');

// Load environment variables
dotenv.config();

// Configuration
const WEBHOOK_URL = `http://localhost:${process.env.PORT || 3000}/webhook/tradingview`;
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || 'your_webhook_secret_key_here';
const NUM_REQUESTS = 50; // Number of requests to send
const CONCURRENCY = 5;   // How many requests to send concurrently

// Sample trade payload template
const createPayload = (index) => ({
  symbol: "BTCUSDT",
  side: index % 2 === 0 ? "buy" : "sell",
  quantity: "0.001",
  price: (50000 + (index * 10)).toString(),
  type: "LIMIT",
  strategy: "MA_CROSSOVER",
  timestamp: new Date().toISOString(),
  message: `Test signal #${index}: Moving average crossover detected`
});

// Generate signature
const generateSignature = (payload, secret) => {
  const hmac = crypto.createHmac('sha256', secret);
  return hmac.update(JSON.stringify(payload)).digest('hex');
};

// Send a single webhook
const sendWebhook = async (index) => {
  const payload = createPayload(index);
  const signature = generateSignature(payload, WEBHOOK_SECRET);
  
  const startTime = Date.now();
  
  try {
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
    
    return {
      success: true,
      index,
      latency,
      mexcLatency: response.data.latency?.mexcApi || 'N/A',
      status: response.status
    };
  } catch (error) {
    return {
      success: false,
      index,
      latency: Date.now() - startTime,
      error: error.response?.data?.message || error.message,
      status: error.response?.status || 0
    };
  }
};

// Process requests in batches with concurrency
const runBatchedRequests = async () => {
  const results = [];
  const batches = Math.ceil(NUM_REQUESTS / CONCURRENCY);
  
  console.log(`Starting performance test with ${NUM_REQUESTS} requests in ${batches} batches (${CONCURRENCY} concurrent requests per batch)`);
  
  const overallStart = Date.now();
  
  for (let i = 0; i < batches; i++) {
    const start = i * CONCURRENCY;
    const end = Math.min(start + CONCURRENCY, NUM_REQUESTS);
    const batch = [];
    
    for (let j = start; j < end; j++) {
      batch.push(sendWebhook(j));
    }
    
    const batchResults = await Promise.all(batch);
    results.push(...batchResults);
    
    console.log(`Completed batch ${i + 1}/${batches}`);
  }
  
  const overallDuration = Date.now() - overallStart;
  
  // Calculate statistics
  const successResults = results.filter(r => r.success);
  const failedResults = results.filter(r => !r.success);
  
  const latencies = successResults.map(r => r.latency);
  const avgLatency = latencies.reduce((sum, val) => sum + val, 0) / latencies.length || 0;
  const minLatency = Math.min(...latencies) || 0;
  const maxLatency = Math.max(...latencies) || 0;
  
  // Calculate percentiles
  latencies.sort((a, b) => a - b);
  const p50 = latencies[Math.floor(latencies.length * 0.5)] || 0;
  const p90 = latencies[Math.floor(latencies.length * 0.9)] || 0;
  const p99 = latencies[Math.floor(latencies.length * 0.99)] || 0;
  
  // Generate report
  const report = {
    summary: {
      totalRequests: NUM_REQUESTS,
      successfulRequests: successResults.length,
      failedRequests: failedResults.length,
      successRate: `${((successResults.length / NUM_REQUESTS) * 100).toFixed(2)}%`,
      totalDuration: `${overallDuration}ms`,
      requestsPerSecond: (NUM_REQUESTS / (overallDuration / 1000)).toFixed(2)
    },
    latency: {
      average: `${avgLatency.toFixed(2)}ms`,
      min: `${minLatency}ms`,
      max: `${maxLatency}ms`,
      p50: `${p50}ms`,
      p90: `${p90}ms`,
      p99: `${p99}ms`
    },
    errors: failedResults.map(r => ({
      index: r.index,
      error: r.error,
      status: r.status
    }))
  };
  
  // Print report to console
  console.log('\nPerformance Test Results:');
  console.log('=======================');
  console.log('Summary:');
  Object.entries(report.summary).forEach(([key, value]) => {
    console.log(`  ${key}: ${value}`);
  });
  
  console.log('\nLatency:');
  Object.entries(report.latency).forEach(([key, value]) => {
    console.log(`  ${key}: ${value}`);
  });
  
  if (failedResults.length > 0) {
    console.log('\nErrors:');
    report.errors.forEach(err => {
      console.log(`  Request #${err.index}: ${err.error} (Status: ${err.status})`);
    });
  }
  
  // Save full results to file
  fs.writeFileSync(
    `performance-report-${new Date().toISOString().replace(/:/g, '-')}.json`,
    JSON.stringify({ report, detailedResults: results }, null, 2)
  );
  
  console.log('\nFull report saved to JSON file.');
};

// Run the test
runBatchedRequests().catch(console.error); 