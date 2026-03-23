# WABM - WhatsApp Business Manager

A full-stack Next.js web application for sending and receiving WhatsApp messages using the WhatsApp Business Cloud API.

## Features

- **Send WhatsApp Messages**: Send text messages to any WhatsApp number
- **Receive Webhooks**: Handle incoming WhatsApp messages and status updates
- **Message Templates**: Fetch and use pre-approved message templates
- **Multi-Number Support**: Switch between test and live WhatsApp numbers
- **Real-time Chat Interface**: Modern UI for message management
- **Environment Configuration**: Secure handling of API credentials
- **Customer Service Window Management**: Track 24-hour messaging windows
- **Beautiful Chakra UI**: Modern, responsive interface

## Prerequisites

- Node.js 18+ and npm
- WhatsApp Business Cloud API credentials
- Meta Business Manager account with WhatsApp Business API access
- A registered WhatsApp Business phone number
- ngrok (for local development webhook testing)

## Environment Variables

Create a `.env.local` file in the root directory with the following variables:

```env
# WhatsApp Business Cloud API
WHATSAPP_ACCESS_TOKEN=your_access_token_here
WHATSAPP_VERIFY_TOKEN=replace-with-a-random-secret
WHATSAPP_WEBHOOK_URL=https://your-ngrok-url.ngrok-free.app/api/webhook

# Note: Business numbers (numberId, wabaId, phoneNumber) are now stored in the BusinessNumber model in the database
# Add them via the admin interface at /admin/numbers
```

## Installation

1. Clone the repository:
```bash
git clone <your-repository-url>
cd <project-directory>
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables (see above)

4. Start ngrok for webhook testing:
```bash
ngrok http 3000
```

5. Update webhook URL (when ngrok changes):
```bash
node update-webhook-url.js
```

6. Run the development server:
```bash
npm run dev
```

7. Open [http://localhost:3000](http://localhost:3000) in your browser

## API Endpoints

### Send Message
- **POST** `/api/send`
- Sends a WhatsApp message to a specified number
- Body: `{ "to": "phone_number", "text": "message", "numberId": "phone_number_id" }`

### Send Template
- **POST** `/api/send-template`
- Sends a pre-approved message template
- Body: `{ "to": "phone_number", "templateName": "template_name", "language": "en_US", "numberId": "phone_number_id" }`

### Webhook
- **GET** `/api/webhook` - Webhook verification
- **POST** `/api/webhook` - Receives incoming messages and status updates

### Templates
- **GET** `/api/templates`
- Fetches available message templates

### Messages
- **GET** `/api/messages`
- Retrieves stored messages

### Customer Service Window Status
- **GET** `/api/window-status?phone=phone_number`
- Checks if customer service window is open for a phone number

## WhatsApp Business API Setup

1. **Create a Meta App**: Go to [Meta for Developers](https://developers.facebook.com/)
2. **Add WhatsApp Product**: Add WhatsApp to your app
3. **Configure Webhook**: Set your webhook URL to your ngrok URL + `/api/webhook`
4. **Get Access Token**: Generate a permanent access token with required permissions
5. **Register Phone Number**: Add your WhatsApp Business phone number
6. **Create Message Templates**: Create templates for business-initiated messages

## Testing

### Test Webhook Functionality
```bash
# Test webhook verification
node test-webhook.js

# Test all functionality
node test-functionality.js
```

### Update Webhook URL
When ngrok URL changes, automatically update your configuration:
```bash
node update-webhook-url.js
```

## Project Structure

```
WABM/
├── app/
│   ├── api/
│   │   ├── send/route.ts           # Send message endpoint
│   │   ├── send-template/route.ts  # Send template endpoint
│   │   ├── webhook/route.ts        # Webhook handler
│   │   ├── templates/route.ts      # Templates endpoint
│   │   ├── messages/route.ts       # Messages endpoint
│   │   └── window-status/route.ts  # Customer service window status
│   ├── components/
│   │   ├── ChatInterface.tsx       # Main chat UI component
│   │   ├── MessageInput.tsx        # Message input component
│   │   ├── Sidebar.tsx             # Sidebar component
│   │   └── ...                     # Other UI components
│   ├── lib/
│   │   ├── webhookConfig.ts        # Webhook configuration
│   │   ├── messageStore.ts         # Message storage
│   │   └── customerServiceWindow.ts # Customer service window management
│   ├── globals.css                 # Global styles
│   ├── layout.tsx                  # Root layout
│   └── page.tsx                    # Home page
├── test-webhook.js                 # Webhook testing script
├── test-functionality.js           # Full functionality testing
├── update-webhook-url.js           # Webhook URL update script
└── WEBHOOK_SETUP.md                # Detailed webhook setup guide
```

## Development

### Available Scripts

- `
