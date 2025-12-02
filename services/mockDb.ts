import { Contact, ChatSession } from '../types';

export const contacts: Contact[] = [
  {
    id: 'ai-nexus',
    name: 'Nexus AI',
    avatar: 'https://picsum.photos/id/1/200/200',
    status: 'online',
    isAi: true,
    bio: 'Advanced Data Assistant v2.5',
    phoneNumber: '+1 (555) 000-AI01'
  },
  {
    id: 'u-alice',
    name: 'Alice Chen',
    avatar: 'https://picsum.photos/id/64/200/200',
    status: 'online',
    bio: 'Frontend Engineer @ TechCorp',
    phoneNumber: '+1 (555) 123-4567'
  },
  {
    id: 'u-bob',
    name: 'Bob Smith',
    avatar: 'https://picsum.photos/id/91/200/200',
    status: 'offline',
    lastSeen: 'Today at 10:30 AM',
    bio: 'Hiking enthusiast 🏔️',
    phoneNumber: '+1 (555) 987-6543'
  },
  {
    id: 'u-charlie',
    name: 'Charlie Davis',
    avatar: 'https://picsum.photos/id/177/200/200',
    status: 'online',
    bio: 'Available for freelance',
    phoneNumber: '+1 (555) 246-8135'
  }
];

export const initialSessions: Record<string, ChatSession> = {
  'ai-nexus': {
    contactId: 'ai-nexus',
    messages: [
      {
        id: 'm-1',
        senderId: 'ai-nexus',
        text: 'Hello! I am Nexus. How can I assist you with your data today?',
        timestamp: new Date(Date.now() - 1000 * 60 * 60),
        status: 'read',
        type: 'text'
      }
    ],
    unreadCount: 0
  },
  'u-alice': {
    contactId: 'u-alice',
    messages: [
      {
        id: 'm-2',
        senderId: 'u-alice',
        text: 'Hey! Did you see the new design specs?',
        timestamp: new Date(Date.now() - 1000 * 60 * 30),
        status: 'read',
        type: 'text'
      }
    ],
    unreadCount: 1
  },
  'u-bob': {
    contactId: 'u-bob',
    messages: [
      {
        id: 'm-3',
        senderId: 'me',
        text: 'Are we still on for lunch?',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24),
        status: 'read',
        type: 'text'
      },
      {
        id: 'm-4',
        senderId: 'u-bob',
        text: 'Yes! 12:30 at the usual place.',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 23),
        status: 'read',
        type: 'text'
      }
    ],
    unreadCount: 0
  }
};