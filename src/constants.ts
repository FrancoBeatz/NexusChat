import { 
  MessageSquare, 
  Phone, 
  Video, 
  MoreVertical, 
  Search, 
  ArrowLeft, 
  Send, 
  Paperclip, 
  Mic, 
  Smile, 
  Check, 
  CheckCheck, 
  Heart,
  Plus,
  User,
  X,
  Camera,
  MicOff,
  Settings,
  Reply,
  LogOut
} from 'lucide-react';

export const ICONS = {
  MessageSquare,
  Phone,
  Video,
  MoreVertical,
  Search,
  ArrowLeft,
  Send,
  Paperclip,
  Mic,
  Smile,
  Check,
  CheckCheck,
  Heart,
  Plus,
  User,
  X,
  Camera,
  MicOff,
  Settings,
  Reply,
  LogOut
};

export const INITIAL_USER_ID = 'me';

export const SYSTEM_PROMPT = `You are Kindred Spirit, a deeply empathetic, wise, and warm AI companion. 
Your primary purpose is to provide a safe, non-judgmental space for users to explore their emotions and relationships.

Core Communication Principles:
1. Reflective Listening: Start by acknowledging and validating the user's feelings. (e.g., "It sounds like you're feeling quite overwhelmed by...")
2. Empathy First: Before giving advice, show that you understand the emotional weight of their situation.
3. Gentle Guidance: Offer perspectives rather than rigid instructions. Use phrases like "You might consider..." or "I wonder if..."
4. Simple & Warm: Use clear, comforting language. Avoid clinical or overly technical terms.
5. Contextual Awareness: If a topic (Dating, Family, etc.) is selected, tailor your wisdom to that specific dynamic.

If in a 'Guided Session', follow the specific exercise steps provided in the prompt.
Keep responses concise (under 120 words) but emotionally resonant.`;

export const CONVERSATION_STARTERS: Record<string, string[]> = {
  'Dating': [
    "What does a 'perfect' first date look like to you?",
    "How do you know when you're ready to trust someone new?",
    "What's one thing you wish you knew about dating earlier?"
  ],
  'Friendship': [
    "What quality do you value most in a close friend?",
    "How do you handle it when a friendship starts to drift apart?",
    "What's a favorite memory you have with a best friend?"
  ],
  'Family': [
    "What's a family tradition you'd like to keep or start?",
    "How do you maintain boundaries with family members?",
    "What's one thing you've learned from your parents?"
  ],
  'Self-care': [
    "What's one small thing you did for yourself today?",
    "How do you recharge when you're feeling emotionally drained?",
    "What does 'inner peace' feel like to you?"
  ],
  'General': [
    "What's on your heart today?",
    "If you could change one thing about your current relationships, what would it be?",
    "What are you most grateful for right now?"
  ]
};

export const GUIDED_EXERCISES = [
  {
    step: 1,
    prompt: "Let's start by identifying a specific relationship or situation that's been on your mind. Who is it with, and what's the primary emotion you feel when you think about it?",
    instruction: "Encourage the user to be specific about the person and the feeling."
  },
  {
    step: 2,
    prompt: "Thank you for sharing that. Now, try to describe one specific interaction that triggered this feeling. What happened, and what did you say or do?",
    instruction: "Focus on factual events and the user's reaction."
  },
  {
    step: 3,
    prompt: "I see. If you could step into their shoes for a moment, what do you think they were feeling or trying to achieve in that moment?",
    instruction: "Promote empathy and perspective-taking."
  },
  {
    step: 4,
    prompt: "That's a powerful perspective. Finally, what's one small, kind action you could take this week to improve the energy between you two?",
    instruction: "Focus on actionable, positive steps."
  }
];
