export interface Contact {
  id: string;
  name: string;
  avatar: string;
  status: 'online' | 'offline' | 'typing';
  lastSeen?: string;
  isAi?: boolean;
  bio?: string;
  phoneNumber?: string;
}

export interface Message {
  id: string;
  senderId: string; // 'me' or contactId
  text: string;
  timestamp: Date;
  status: 'sent' | 'delivered' | 'read';
  type: 'text' | 'image' | 'audio';
}

export interface ChatSession {
  contactId: string;
  messages: Message[];
  unreadCount: number;
  draft?: string;
}

export enum AppView {
  CHAT_LIST = 'CHAT_LIST',
  CHAT_WINDOW = 'CHAT_WINDOW',
  PROFILE = 'PROFILE'
}