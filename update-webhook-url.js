#!/usr/bin/env node

/**
 * WhatsApp webhook URL update script
 * Automatically updates the webhook URL in your .env.local file when ngrok changes
 */

const fs = require('fs');
const path = require('path');

async function getNgrokUrl() {
  try {
    const response = await fetch('http://localhost:4040/api/tunnels');
    const data = await response.json();
    
    if (data.tunnels && data.tunnels.length > 0) {
      return data.tunnels[0].public_url;
    }
    
    throw new Error('No ngrok tunnels found');
  } catch (error) {
    console.error('❌ Could not get ngrok URL:', error.message);
    console.log('💡 Make sure ngrok is running with: ngrok http 3000');
    return null;
  }
}

function updateEnvFile(webhookUrl) {
  const envPath = path.join(process.cwd(), '.env.local');
  const envExamplePath = path.join(process.cwd(), 'env.example');
  
  // Update .env.local if it exists
  if (fs.existsSync(envPath)) {
    let envContent = fs.readFileSync(envPath, 'utf8');
    
    // Check if WHATSAPP_WEBHOOK_URL already exists
    if (envContent.includes('WHATSAPP_WEBHOOK_URL=')) {
      envContent = envContent.replace(
        /WHATSAPP_WEBHOOK_URL=.*/g,
        `WHATSAPP_WEBHOOK_URL=${webhookUrl}/api/webhook`
      );
    } else {
      // Add the webhook URL if it doesn't exist
      envContent += `\nWHATSAPP_WEBHOOK_URL=${webhookUrl}/api/webhook`;
    }
    
    fs.writeFileSync(envPath, envContent);
    console.log('✅ Updated .env.local file');
  } else {
    console.log('⚠️  .env.local file not found. Creating it...');
    const envContent = `# WhatsApp Business API configuration
WHATSAPP_ACCESS_TOKEN=your_whatsapp_access_token_here
WHATSAPP_VERIFY_TOKEN=replace-with-a-random-secret
WHATSAPP_WEBHOOK_URL=${webhookUrl}/api/webhook

# Note: Business numbers (numberId, wabaId, phoneNumber) are now stored in the BusinessNumber model in the database
# Add them via the admin interface at /admin/numbers`;
    
    fs.writeFileSync(envPath, envContent);
    console.log('✅ Created .env.local file');
  }
  
  // Update env.example
  if (fs.existsSync(envExamplePath)) {
    let exampleContent = fs.readFileSync(envExamplePath, 'utf8');
    exampleContent = exampleContent.replace(
      /WHATSAPP_WEBHOOK_URL=.*/g,
      `WHATSAPP_WEBHOOK_URL=${webhookUrl}/api/webhook`
    );
    fs.writeFileSync(envExamplePath, exampleContent);
    console.log('✅ Updated env.example file');
  }
}

async function main() {
  console.log('🔄 Updating webhook URL...\n');
  
  const ngrokUrl = await getNgrokUrl();
  if (!ngrokUrl) {
    process.exit(1);
  }
  
  console.log(`🌐 Found ngrok URL: ${ngrokUrl}`);
  console.log(`🔗 Webhook URL: ${ngrokUrl}/api/webhook\n`);
  
  updateEnvFile(ngrokUrl);
  
  console.log('\n📋 Next Steps:');
  console.log('1. Update your WhatsApp Business API dashboard webhook URL');
  console.log(`2. Set webhook URL to: ${ngrokUrl}/api/webhook`);
  console.log('3. Use the same verify token value in Meta that you set in WHATSAPP_VERIFY_TOKEN');
  console.log('4. Test webhook verification with: node test-webhook.js');
  
  console.log('\n✨ Webhook URL updated successfully!');
}

// Run the script
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { getNgrokUrl, updateEnvFile }; 
