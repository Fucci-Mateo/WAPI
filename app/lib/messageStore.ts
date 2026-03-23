export interface StoredMessage {
  id: string;
  from: string;
  to: string;
  text: string;
  timestamp: string;
  type: 'sent' | 'received';
  status: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
  contactName?: string;
}

class MessageStore {
  private messages: StoredMessage[] = [];

  addMessage(message: StoredMessage): void {
    this.messages.push(message);
    console.log(`📝 Message stored: ${message.from} -> ${message.text}`);
  }

  updateMessageStatus(messageId: string, status: StoredMessage['status']): void {
    const message = this.messages.find(msg => msg.id === messageId);
    if (message) {
      message.status = status;
      console.log(`📊 Message status updated: ${messageId} -> ${status}`);
    }
  }

  getMessages(): StoredMessage[] {
    return [...this.messages];
  }

  getMessagesByPhoneNumber(phoneNumber: string): StoredMessage[] {
    return this.messages.filter(msg => 
      msg.from === phoneNumber || msg.to === phoneNumber
    );
  }

  getContactName(phoneNumber: string): string | null {
    // Find a message from this phone number to get the contact name
    const message = this.messages.find(msg => msg.from === phoneNumber);
    return message?.contactName || null;
  }

  clearMessages(): void {
    this.messages = [];
  }
}

// Global instance
export const messageStore = new MessageStore(); 