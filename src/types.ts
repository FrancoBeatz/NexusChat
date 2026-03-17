export type RelationshipTopic = 'Dating' | 'Friendship' | 'Family' | 'Self-care' | 'General';

export interface UserProfile {
  name: string;
  avatar: string;
  bio: string;
}

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
  type: 'text' | 'image' | 'audio' | 'system';
  imageUrl?: string;
  replyToId?: string;
  reactions?: Record<string, string[]>; // emoji -> userIds[]
}

export interface ChatSession {
  contactId: string;
  messages: Message[];
  unreadCount: number;
  draft?: string;
  topic?: RelationshipTopic;
  isGuided?: boolean;
  currentStep?: number;
}

export enum AppView {
  CHAT_LIST = 'CHAT_LIST',
  CHAT_WINDOW = 'CHAT_WINDOW',
  PROFILE = 'PROFILE',
  ONBOARDING = 'ONBOARDING'
}
