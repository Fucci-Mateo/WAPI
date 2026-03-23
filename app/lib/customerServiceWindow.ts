export interface CustomerServiceWindow {
  phoneNumber: string;
  isOpen: boolean;
  openedAt: string; // ISO timestamp
  expiresAt: string; // ISO timestamp (24 hours from openedAt)
  lastUserMessageAt?: string; // When user last messaged
  messageCount: number; // Number of messages in this window
}

export interface WindowStatus {
  isOpen: boolean;
  canSendFreeForm: boolean;
  canSendTemplate: boolean;
  timeRemaining: number; // milliseconds
  expiresAt: string;
}

// 24 hours in milliseconds
const CUSTOMER_SERVICE_WINDOW_DURATION = 24 * 60 * 60 * 1000;

export class CustomerServiceWindowManager {
  private windows: Map<string, CustomerServiceWindow> = new Map();

  /**
   * Check if a customer service window is open for a phone number
   */
  isWindowOpen(phoneNumber: string): boolean {
    const window = this.windows.get(phoneNumber);
    if (!window) return false;

    const now = new Date();
    const expiresAt = new Date(window.expiresAt);
    
    return now < expiresAt;
  }

  /**
   * Get the current window status for a phone number
   */
  getWindowStatus(phoneNumber: string): WindowStatus {
    const window = this.windows.get(phoneNumber);
    const now = new Date();
    
    if (!window) {
      return {
        isOpen: false,
        canSendFreeForm: false,
        canSendTemplate: true, // Can always send templates
        timeRemaining: 0,
        expiresAt: now.toISOString()
      };
    }

    const expiresAt = new Date(window.expiresAt);
    const timeRemaining = Math.max(0, expiresAt.getTime() - now.getTime());
    const isOpen = now < expiresAt;

    return {
      isOpen,
      canSendFreeForm: isOpen,
      canSendTemplate: true, // Can always send templates
      timeRemaining,
      expiresAt: window.expiresAt
    };
  }

  /**
   * Open or refresh a customer service window
   * Called when user sends a message or calls
   */
  openWindow(phoneNumber: string): void {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + CUSTOMER_SERVICE_WINDOW_DURATION);

    const existingWindow = this.windows.get(phoneNumber);
    
    const window: CustomerServiceWindow = {
      phoneNumber,
      isOpen: true,
      openedAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      lastUserMessageAt: now.toISOString(),
      messageCount: existingWindow ? existingWindow.messageCount + 1 : 1
    };

    this.windows.set(phoneNumber, window);
  }

  /**
   * Record a user message (opens/refreshes the window)
   */
  recordUserMessage(phoneNumber: string): void {
    this.openWindow(phoneNumber);
  }

  /**
   * Check if we can send a specific message type
   */
  canSendMessageType(phoneNumber: string, messageType: 'text' | 'template' | 'media' | 'interactive'): boolean {
    const status = this.getWindowStatus(phoneNumber);
    
    if (messageType === 'template') {
      return status.canSendTemplate;
    }
    
    return status.canSendFreeForm;
  }

  /**
   * Get formatted time remaining
   */
  getTimeRemainingFormatted(phoneNumber: string): string {
    const status = this.getWindowStatus(phoneNumber);
    
    if (!status.isOpen) {
      return 'Window closed';
    }

    const hours = Math.floor(status.timeRemaining / (1000 * 60 * 60));
    const minutes = Math.floor((status.timeRemaining % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `${hours}h ${minutes}m remaining`;
    }
    
    return `${minutes}m remaining`;
  }

  /**
   * Get all active windows
   */
  getActiveWindows(): CustomerServiceWindow[] {
    const now = new Date();
    return Array.from(this.windows.values()).filter(window => 
      new Date(window.expiresAt) > now
    );
  }

  /**
   * Clean up expired windows
   */
  cleanupExpiredWindows(): void {
    const now = new Date();
    for (const [phoneNumber, window] of this.windows.entries()) {
      if (new Date(window.expiresAt) <= now) {
        this.windows.delete(phoneNumber);
      }
    }
  }

  /**
   * Get window info for a phone number
   */
  getWindow(phoneNumber: string): CustomerServiceWindow | null {
    return this.windows.get(phoneNumber) || null;
  }
}

// Global instance
export const customerServiceWindowManager = new CustomerServiceWindowManager();

// Clean up expired windows every hour
setInterval(() => {
  customerServiceWindowManager.cleanupExpiredWindows();
}, 60 * 60 * 1000); 