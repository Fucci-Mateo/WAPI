# WhatsApp Webhook Setup Guide

This project expects a public HTTPS webhook endpoint at `/api/webhook`.

## ⚙️ **WhatsApp Business API Configuration**

### **Step 1: Environment Variables**
Create `.env.local` file with:
```bash
WHATSAPP_ACCESS_TOKEN=your_whatsapp_access_token_here
WHATSAPP_VERIFY_TOKEN=replace-with-a-random-secret
WHATSAPP_WEBHOOK_URL=https://your-domain.com/api/webhook
```

### **Step 2: WhatsApp Business API Dashboard**
1. Go to your WhatsApp Business API dashboard
2. Navigate to **Webhook Configuration**
3. Set the following values:
   - **Webhook URL**: `https://your-domain.com/api/webhook`
   - **Verify Token**: the same value used for `WHATSAPP_VERIFY_TOKEN`
   - **Subscribe to Events**: 
     - ✅ `messages`
     - ✅ `message_status`

### **Step 3: Test Webhook Verification**
Test that your webhook is properly configured:
```bash
curl "https://your-domain.com/api/webhook?hub.mode=subscribe&hub.verify_token=replace-with-a-random-secret&hub.challenge=test123"
```
Expected response: `test123`

## 📱 **Testing Message Reception**

### **Send a Test Message**
1. Send a WhatsApp message to your business number
2. Check your local server logs for incoming webhook data
3. The message should appear in your WhatsApp Business Manager

### **Monitor Webhook Activity**
Watch your server logs for:
- 📥 Incoming message webhooks
- 📊 Message status updates
- 🕐 Customer service window management

## 🔧 **Local Development Commands**

### **Start the Development Server**
```bash
npm run dev
```

### **Start ngrok Tunnel**
```bash
ngrok http 3000
```

### **Check ngrok Status**
```bash
curl http://localhost:4040/api/tunnels
```

### **Test Webhook Functionality**
```bash
# Test webhook verification
node test-webhook.js

# Test all functionality
node test-functionality.js
```

## 📋 **Webhook Events Handled**

### **Message Events**
- ✅ Text messages
- ✅ Template messages  
- ✅ Image messages
- ✅ Message status updates

### **Customer Service Windows**
- ✅ 24-hour window management
- ✅ Message type restrictions
- ✅ Real-time status updates

## 🚨 **Important Notes**

### **ngrok URL Changes**
- ngrok URLs change each time you restart the tunnel
- Update your WhatsApp webhook URL when the tunnel changes
- Update `WHATSAPP_WEBHOOK_URL` in your `.env.local` file
- Consider using ngrok with a custom domain for production

### **Security**
- The verify token provides basic security
- Consider additional authentication for production
- Monitor webhook logs for suspicious activity

### **Production Deployment**
- Replace ngrok with your production domain
- Update `WHATSAPP_WEBHOOK_URL` in environment variables
- Ensure HTTPS is properly configured

## 🎯 **Application Features**

### **Customer Service Window Management**
- Automatically tracks 24-hour windows
- Prevents sending restricted message types
- Real-time UI status indicators

### **Message Processing**
- Handles incoming WhatsApp messages
- Updates customer service windows
- Logs all webhook activity

### **Error Handling**
- Graceful error handling for webhook failures
- Detailed logging for debugging
- Fallback responses for invalid requests

## 📞 **Support**

For issues with webhook configuration:
1. Check server logs for error messages
2. Verify ngrok tunnel is active
3. Confirm WhatsApp API credentials
4. Test webhook verification endpoint

---
**Webhook Endpoint**: `/api/webhook`
