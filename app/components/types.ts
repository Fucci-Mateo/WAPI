export interface Message {
  id: string;
  from: string;
  to: string;
  text: string;
  timestamp: string;
  type: 'sent' | 'received';
  status?: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
  userId?: string; // Internal user who sent the message (for sent messages)
  userName?: string; // Name of the user who sent the message
  canViewTemplate?: boolean; // Whether user can view template content (false shows placeholder)
  media?: {
    kind: 'image' | 'audio' | 'document';
    id: string; // WhatsApp media id
    url?: string; // proxied URL
    mimeType?: string;
    fileName?: string; // For documents
  };
}

export interface Template {
  id: string;
  name: string;
  language: string;
  status: string;
  category: string;
  components?: any[];
}

export interface NumberOption {
  id: string;
  label: string;
  numberId: string;
  wabaId: string;
}

export interface BulkProgress {
  sent: number;
  total: number;
  failed: string[];
}

export interface ActiveChat {
  phoneNumber: string;
  contactName: string | null;
  lastMessage: string | null;
  lastMessageTimestamp: string | null;
  lastMessageType: 'sent' | 'received' | null;
  unreadCount: number;
} 