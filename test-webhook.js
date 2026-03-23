#!/usr/bin/env node

/**
 * WhatsApp webhook testing script
 * Tests webhook verification and simulates incoming messages
 */

const https = require('https');
const http = require('http');

// Configuration
const WEBHOOK_URL = process.env.WHATSAPP_WEBHOOK_URL;
const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN;

if (!WEBHOOK_URL || !VERIFY_TOKEN) {
  console.error('Missing WHATSAPP_WEBHOOK_URL or WHATSAPP_VERIFY_TOKEN.');
  process.exit(1);
}

console.log('🚀 Starting WhatsApp webhook tests...\n');

// Test webhook verification
async function testWebhookVerification() {
  console.log('🔍 Testing webhook verification...');
  
  return new Promise((resolve, reject) => {
    const url = `${WEBHOOK_URL}?hub.mode=subscribe&hub.verify_token=${VERIFY_TOKEN}&hub.challenge=test123`;
    
    const req = https.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 200 && data === 'test123') {
          console.log('✅ Webhook verification successful!');
          resolve();
        } else {
          console.log('❌ Webhook verification failed:', res.statusCode, data);
          reject(new Error('Webhook verification failed'));
        }
      });
    });
    
    req.on('error', (err) => {
      console.log('❌ Webhook verification error:', err.message);
      reject(err);
    });
    
    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('Webhook verification timeout'));
    });
  });
}

// Simulate incoming message
async function simulateIncomingMessage() {
  console.log('📥 Simulating incoming message...');
  
  const mockWebhookData = {
    object: "whatsapp_business_account",
    entry: [
      {
        id: "test_waba_id",
        changes: [
          {
            value: {
              messaging_product: "whatsapp",
              metadata: {
                display_phone_number: "15550000000",
                phone_number_id: "test_phone_number_id"
              },
              contacts: [
                {
                  profile: {
                    name: "Test User"
                  },
                  wa_id: "15551234567"
                }
              ],
              messages: [
                {
                  from: "15551234567",
                  id: "wamid.test.simulation",
                  timestamp: `${Math.floor(Date.now() / 1000)}`,
                  text: {
                    body: "Hello from webhook test"
                  },
                  type: "text"
                }
              ]
            },
            field: "messages"
          }
        ]
      }
    ]
  };
  
  return new Promise((resolve, reject) => {
    const url = new URL(WEBHOOK_URL);
    const options = {
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(JSON.stringify(mockWebhookData))
      }
    };
    
    const client = url.protocol === 'https:' ? https : http;
    const req = client.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          console.log('✅ Incoming message simulation successful!');
          resolve();
        } else {
          console.log('❌ Incoming message simulation failed:', res.statusCode, data);
          reject(new Error('Incoming message simulation failed'));
        }
      });
    });
    
    req.on('error', (err) => {
      console.log('❌ Incoming message simulation error:', err.message);
      reject(err);
    });
    
    req.write(JSON.stringify(mockWebhookData));
    req.end();
    
    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('Incoming message simulation timeout'));
    });
  });
}

// Run all tests
async function runAllTests() {
  try {
    await testWebhookVerification();
    await simulateIncomingMessage();
    
    console.log('\n✨ Webhook testing completed!');
    console.log('\n📋 Next Steps:');
    console.log('1. Configure WhatsApp Business API with the webhook URL');
    console.log('2. Send real messages to test webhook processing');
    console.log('3. Monitor server logs for webhook activity');
    
  } catch (error) {
    console.error('\n❌ Webhook testing failed:', error.message);
    process.exit(1);
  }
}

runAllTests(); 
