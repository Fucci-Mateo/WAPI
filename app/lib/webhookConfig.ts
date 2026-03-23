export interface WebhookConfig {
  verifyToken: string;
  webhookUrl: string;
  isConfigured: boolean;
}

export class WebhookManager {
  private static instance: WebhookManager;
  private config: WebhookConfig;

  private constructor() {
    this.config = {
      verifyToken: process.env.WHATSAPP_VERIFY_TOKEN || '',
      webhookUrl: process.env.WHATSAPP_WEBHOOK_URL || '',
      isConfigured: Boolean(process.env.WHATSAPP_VERIFY_TOKEN && process.env.WHATSAPP_WEBHOOK_URL)
    };
  }

  static getInstance(): WebhookManager {
    if (!WebhookManager.instance) {
      WebhookManager.instance = new WebhookManager();
    }
    return WebhookManager.instance;
  }

  getConfig(): WebhookConfig {
    return { ...this.config };
  }

  isWebhookConfigured(): boolean {
    return this.config.isConfigured && !!this.config.webhookUrl;
  }

  getVerifyToken(): string {
    return this.config.verifyToken;
  }

  getWebhookUrl(): string {
    return this.config.webhookUrl;
  }

  // Generate a secure verification token for a new environment.
  generateVerifyToken(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2);
    return `wabm_webhook_${timestamp}_${random}`;
  }
}

export const WHATSAPP_WEBHOOK_SETUP = {
  title: "WhatsApp Webhook Setup",
  steps: [
    {
      step: 1,
      title: "Environment Variables",
      description: "Add to your .env.local file:",
      code: `WHATSAPP_VERIFY_TOKEN=replace-with-a-random-secret
WHATSAPP_WEBHOOK_URL=https://your-domain.com/api/webhook`,
    },
    {
      step: 2,
      title: "WhatsApp Business API",
      description: "Configure in WhatsApp Business API dashboard:",
      items: [
        "Webhook URL: https://your-domain.com/api/webhook",
        "Verify Token: the same value used for WHATSAPP_VERIFY_TOKEN",
        "Subscribe to: messages, message_status"
      ]
    }
  ]
};
