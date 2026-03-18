import { Contact, ChatSession } from '../types';

export const contacts: Contact[] = [
  {
    id: 'ai-kindred',
    name: 'Kindred Spirit',
    avatar: 'https://picsum.photos/id/1027/200/200',
    status: 'online',
    isAi: true,
    bio: 'Your empathetic AI companion for life and love.',
    phoneNumber: 'Kindred'
  },
  {
    id: 'u-maya',
    name: 'Maya Sharma',
    avatar: 'https://picsum.photos/id/1011/200/200',
    status: 'online',
    bio: 'Life is better with friends 🌸',
    phoneNumber: '+1 (555) 111-2222'
  },
  {
    id: 'u-leo',
    name: 'Leo Brooks',
    avatar: 'https://picsum.photos/id/1005/200/200',
    status: 'offline',
    lastSeen: 'Today at 9:15 AM',
    bio: 'Always learning, always growing.',
    phoneNumber: '+1 (555) 333-4444'
  },
  {
    id: 'u-sarah',
    name: 'Sarah Jenkins',
    avatar: 'https://picsum.photos/id/1025/200/200',
    status: 'online',
    bio: 'Coffee, books, and deep talks.',
    phoneNumber: '+1 (555) 555-6666'
  }
];

export const initialSessions: Record<string, ChatSession> = {
  'ai-kindred': {
    contactId: 'ai-kindred',
    messages: [
      {
        id: 'm-1',
        senderId: 'ai-kindred',
        text: "Hello there. I'm Kindred Spirit. I'm here to listen and help you with your relationships or anything on your mind. How are you feeling today?",
        timestamp: new Date(Date.now() - 1000 * 60 * 60),
        status: 'read',
        type: 'text'
      }
    ],
    unreadCount: 0
  },
  'u-maya': {
    contactId: 'u-maya',
    messages: [
      {
        id: 'm-2',
        senderId: 'u-maya',
        text: 'Hey! I was thinking about what you said earlier. Relationships can be tough, but you handled it so well.',
        timestamp: new Date(Date.now() - 1000 * 60 * 30),
        status: 'read',
        type: 'text'
      }
    ],
    unreadCount: 1
  }
};