#!/usr/bin/env node

/**
 * WhatsApp Business API test suite
 * Tests all major functionality of the WhatsApp Business Manager
 */

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    console.error(`Missing required environment variable: ${name}`);
    process.exit(1);
  }

  return value;
}

const WHATSAPP_WEBHOOK_URL = requireEnv('WHATSAPP_WEBHOOK_URL');
const VERIFY_TOKEN = requireEnv('WHATSAPP_VERIFY_TOKEN');
const TEST_RECIPIENT_PHONE = requireEnv('TEST_RECIPIENT_PHONE');
const TEST_WHATSAPP_NUMBER_ID = requireEnv('TEST_WHATSAPP_NUMBER_ID');
const TEST_WHATSAPP_WABA_ID = requireEnv('TEST_WHATSAPP_WABA_ID');
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

// Test webhook verification
async function testWebhookVerification() {
  console.log('🔍 Testing webhook verification...');
  
  try {
    const url = `${WHATSAPP_WEBHOOK_URL}?hub.mode=subscribe&hub.verify_token=${VERIFY_TOKEN}&hub.challenge=test123`;
    const response = await fetch(url);
    const text = await response.text();
    
    if (response.ok && text === 'test123') {
      console.log('✅ Webhook verification successful!');
      return true;
    } else {
      console.log('❌ Webhook verification failed:', text);
      return false;
    }
  } catch (error) {
    console.log('❌ Webhook verification error:', error.message);
    return false;
  }
}

// Test message sending
async function testMessageSending() {
  console.log('📤 Testing message sending...');
  
  try {
    const response = await fetch(`${BASE_URL}/api/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: TEST_RECIPIENT_PHONE,
        text: 'Test message from WhatsApp Business Manager',
        numberId: TEST_WHATSAPP_NUMBER_ID
      })
    });
    
    const data = await response.json();
    
    if (response.ok && data.status === 'sent') {
      console.log('✅ Message sending successful!');
      return true;
    } else {
      console.log('❌ Message sending failed:', data.error);
      return false;
    }
  } catch (error) {
    console.log('❌ Message sending error:', error.message);
    return false;
  }
}

// Test template sending
async function testTemplateSending() {
  console.log('📋 Testing template sending...');
  
  try {
    const response = await fetch(`${BASE_URL}/api/send-template`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: TEST_RECIPIENT_PHONE,
        templateName: 'hello_world',
        language: 'en_US',
        numberId: TEST_WHATSAPP_NUMBER_ID
      })
    });
    
    const data = await response.json();
    
    if (response.ok && data.status === 'sent') {
      console.log('✅ Template sending successful!');
      return true;
    } else {
      console.log('❌ Template sending failed:', data.error);
      return false;
    }
  } catch (error) {
    console.log('❌ Template sending error:', error.message);
    return false;
  }
}

// Test message fetching
async function testMessageFetching() {
  console.log('📥 Testing message fetching...');
  
  try {
    const response = await fetch(`${BASE_URL}/api/messages`);
    const data = await response.json();
    
    if (response.ok && Array.isArray(data.messages)) {
      console.log(`✅ Message fetching successful! Found ${data.messages.length} messages`);
      return true;
    } else {
      console.log('❌ Message fetching failed:', data.error);
      return false;
    }
  } catch (error) {
    console.log('❌ Message fetching error:', error.message);
    return false;
  }
}

// Test template fetching
async function testTemplateFetching() {
  console.log('📋 Testing template fetching...');
  
  try {
    const response = await fetch(`${BASE_URL}/api/templates`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        wabaId: TEST_WHATSAPP_WABA_ID
      })
    });
    
    const data = await response.json();
    
    if (response.ok && Array.isArray(data.templates)) {
      console.log(`✅ Template fetching successful! Found ${data.templates.length} templates`);
      return true;
    } else {
      console.log('❌ Template fetching failed:', data.error);
      return false;
    }
  } catch (error) {
    console.log('❌ Template fetching error:', error.message);
    return false;
  }
}

// Test webhook message processing
async function testWebhookMessageProcessing() {
  console.log('📥 Testing webhook message processing...');
  
  try {
    const mockWebhookData = {
      object: 'whatsapp_business_account',
      entry: [{
        changes: [{
          value: {
            messages: [{
              id: 'test_message_id',
              from: TEST_RECIPIENT_PHONE,
              type: 'text',
              text: { body: 'Test webhook message' },
              timestamp: Math.floor(Date.now() / 1000)
            }],
            contacts: [{
              wa_id: TEST_RECIPIENT_PHONE,
              profile: { name: 'Test User' }
            }],
            metadata: {
              display_phone_number: TEST_WHATSAPP_NUMBER_ID
            }
          }
        }]
      }]
    };

    const response = await fetch(WHATSAPP_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(mockWebhookData)
    });
    
    const data = await response.json();
    
    if (response.ok && data.status === 'ok') {
      console.log('✅ Webhook message processing working!');
      return true;
    } else {
      console.log('❌ Webhook message processing failed:', data.error);
      return false;
    }
  } catch (error) {
    console.log('❌ Webhook message processing error:', error.message);
    return false;
  }
}

// Test customer service window management
async function testCustomerServiceWindow() {
  console.log('🕐 Testing customer service window management...');
  
  try {
    const response = await fetch(`${BASE_URL}/api/window-status?phone=${encodeURIComponent(TEST_RECIPIENT_PHONE)}`);
    const data = await response.json();
    
    if (response.ok && typeof data.isOpen === 'boolean') {
      console.log('✅ Customer service window management working!');
      console.log(`   Window status: ${data.isOpen ? 'Open' : 'Closed'}`);
      return true;
    } else {
      console.log('❌ Customer service window management failed:', data.error);
      return false;
    }
  } catch (error) {
    console.log('❌ Customer service window management error:', error.message);
    return false;
  }
}

// Main test runner
async function runAllTests() {
  console.log('🚀 Starting WhatsApp Business API test suite...\n');
  
  const tests = [
    { name: 'Webhook Verification', fn: testWebhookVerification },
    { name: 'Message Sending', fn: testMessageSending },
    { name: 'Template Sending', fn: testTemplateSending },
    { name: 'Message Fetching', fn: testMessageFetching },
    { name: 'Template Fetching', fn: testTemplateFetching },
    { name: 'Webhook Message Processing', fn: testWebhookMessageProcessing },
    { name: 'Customer Service Window', fn: testCustomerServiceWindow }
  ];
  
  let passed = 0;
  let failed = 0;
  
  for (const test of tests) {
    console.log(`\n🧪 Running: ${test.name}`);
    const result = await test.fn();
    
    if (result) {
      passed++;
    } else {
      failed++;
    }
  }
  
  console.log('\n📊 Test Results:');
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📈 Success Rate: ${Math.round((passed / tests.length) * 100)}%`);
  
  if (failed === 0) {
    console.log('\n🎉 All tests passed. Your WhatsApp Business Manager is working correctly.');
  } else {
    console.log('\n⚠️  Some tests failed. Check the logs above for details.');
  }
  
  console.log('\n🔧 Next Steps:');
  console.log('1. Configure WhatsApp Business API with the webhook URL');
  console.log('2. Test sending messages from the web interface');
  console.log('3. Monitor server logs for webhook activity');
}

// Export functions for individual testing
module.exports = {
  testWebhookVerification,
  testMessageSending,
  testTemplateSending,
  testMessageFetching,
  testTemplateFetching,
  testWebhookMessageProcessing,
  testCustomerServiceWindow,
  runAllTests
};

// Run tests if this file is executed directly
if (require.main === module) {
  runAllTests().catch(console.error);
} 
