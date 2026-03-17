import React, { useState, useEffect, useCallback, useRef } from 'react';
import Sidebar from './components/Sidebar';
import ChatWindow from './components/ChatWindow';
import ProfileEdit from './components/ProfileEdit';
import Onboarding from './components/Onboarding';
import { supabase, isSupabaseConfigured } from './supabase';
import { Contact, ChatSession, Message, AppView, UserProfile, RelationshipTopic } from './types';
import { sendMessageToGemini } from './services/geminiService';
import { INITIAL_USER_ID, GUIDED_EXERCISES } from './constants';
import { AnimatePresence } from 'motion/react';
import { io, Socket } from 'socket.io-client';

const App: React.FC = () => {
  const [user, setUser] = useState<any | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [activeContactId, setActiveContactId] = useState<string | null>(null);
  const [sessions, setSessions] = useState<Record<string, ChatSession>>({});
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [view, setView] = useState<AppView>(AppView.ONBOARDING);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [authMessage, setAuthMessage] = useState<string | null>(null);

  const socketRef = useRef<Socket | null>(null);

  // Initialize Socket.io
  useEffect(() => {
    const socket = io();
    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('Connected to server');
    });

    socket.on('receive-message', (message: Message) => {
      // Find which contact this message belongs to
      addMessage(message.senderId, message);

      // Browser Notification
      if (Notification.permission === 'granted' && document.hidden) {
        const contact = contacts.find(c => c.id === message.senderId);
        new Notification(`New message from ${contact?.name || 'Kindred'}`, {
          body: message.text,
          icon: contact?.avatar
        });
      }
    });

    // Request notification permission
    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }

    socket.on('user-typing', (data: { roomId: string, userId: string, isTyping: boolean }) => {
      setContacts(prev => prev.map(c => 
        c.id === data.userId ? { ...c, status: data.isTyping ? 'typing' : 'online' } : c
      ));
    });

    socket.on('user-status', (data: { userId: string, status: 'online' | 'offline' }) => {
      setContacts(prev => prev.map(c => 
        c.id === data.userId ? { ...c, status: data.status } : c
      ));
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  // Join room when active contact changes
  useEffect(() => {
    if (activeContactId && socketRef.current) {
      socketRef.current.emit('join-room', activeContactId);
    }
  }, [activeContactId]);

  // Auth Listener
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        checkUserProfile(session.user.id);
      }
      setIsAuthReady(true);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        checkUserProfile(session.user.id);
      } else {
        setView(AppView.ONBOARDING);
      }
      setIsAuthReady(true);
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkUserProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (data) {
        setUserProfile({
          name: data.name,
          avatar: data.avatar_url,
          bio: data.bio || ''
        });
        setView(AppView.CHAT_LIST);
      } else {
        setView(AppView.ONBOARDING);
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
      setView(AppView.ONBOARDING);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthMessage(null);
    setIsLoading(true);
    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
          },
        });
        if (error) throw error;
        setAuthMessage('Success! Please check your email for the confirmation link.');
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      }
    } catch (error: any) {
      setAuthError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      setUserProfile(null);
      setView(AppView.ONBOARDING);
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin
        }
      });
      if (error) throw error;
    } catch (error) {
      console.error("Login failed:", error);
    }
  };

  const handleOnboardingComplete = async (profile: UserProfile) => {
    if (!user) return;
    try {
      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          name: profile.name,
          avatar_url: profile.avatar,
          bio: profile.bio,
          status: 'online',
          last_seen: new Date().toISOString()
        });
      
      if (error) throw error;

      setUserProfile(profile);
      setView(AppView.CHAT_LIST);
    } catch (error) {
      console.error("Failed to save profile:", error);
    }
  };

  // Fetch Contacts and Conversations
  useEffect(() => {
    if (!user) return;

    // Fetch initial contacts
    const fetchContacts = async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .neq('id', user.id);
      
      if (data) {
        const usersList = data.map(p => ({
          id: p.id,
          name: p.name,
          avatar: p.avatar_url,
          status: p.status,
          bio: p.bio || '',
          lastSeen: p.last_seen
        } as Contact));

        const aiContact: Contact = {
          id: 'ai-spirit',
          name: 'Kindred Spirit',
          avatar: 'https://picsum.photos/seed/kindred/200/200',
          status: 'online',
          isAi: true,
          bio: 'Your empathetic AI companion.'
        };
        
        setContacts([aiContact, ...usersList]);
      }
    };

    // Fetch initial conversations
    const fetchConversations = async () => {
      const { data, error } = await supabase
        .from('conversation_participants')
        .select('conversation_id, conversations(*)')
        .eq('user_id', user.id);
      
      if (data) {
        const convs: Record<string, ChatSession> = {};
        for (const item of data) {
          const conv = item.conversations as any;
          if (!conv) continue;
          
          // Get other participant
          const { data: participants } = await supabase
            .from('conversation_participants')
            .select('user_id')
            .eq('conversation_id', conv.id)
            .neq('user_id', user.id);
          
          const otherParticipant = participants?.[0]?.user_id || 'ai-spirit';
          convs[otherParticipant] = {
            contactId: otherParticipant,
            messages: [],
            unreadCount: 0,
            topic: conv.topic || 'General'
          };
        }
        setSessions(prev => ({ ...prev, ...convs }));
      }
    };

    fetchContacts();
    fetchConversations();

    // Set up real-time subscriptions
    const profilesSubscription = supabase
      .channel('public:profiles')
      .on('postgres_changes' as any, { event: '*', schema: 'public', table: 'profiles' }, (payload: any) => {
        const updatedProfile = payload.new as any;
        if (updatedProfile.id === user.id) return;

        setContacts(prev => prev.map(c => 
          c.id === updatedProfile.id ? {
            ...c,
            name: updatedProfile.name,
            avatar: updatedProfile.avatar_url,
            status: updatedProfile.status,
            lastSeen: updatedProfile.last_seen
          } : c
        ));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(profilesSubscription);
    };
  }, [user]);

  // Fetch Messages for active contact
  useEffect(() => {
    if (!user || !activeContactId) return;

    const fetchMessages = async () => {
      // Find conversation ID
      const { data: participants } = await supabase
        .from('conversation_participants')
        .select('conversation_id')
        .eq('user_id', user.id);
      
      const convIds = participants?.map(p => p.conversation_id) || [];
      
      const { data: otherParticipants } = await supabase
        .from('conversation_participants')
        .select('conversation_id')
        .in('conversation_id', convIds)
        .eq('user_id', activeContactId)
        .single();

      if (otherParticipants) {
        const convId = otherParticipants.conversation_id;
        const { data: msgs, error } = await supabase
          .from('messages')
          .select('*')
          .eq('conversation_id', convId)
          .order('timestamp', { ascending: true });

        if (msgs) {
          const formattedMsgs = msgs.map(m => ({
            id: m.id,
            senderId: m.sender_id || 'ai-spirit',
            text: m.text,
            imageUrl: m.image_url,
            timestamp: new Date(m.timestamp),
            status: m.status,
            type: m.message_type,
            replyToId: m.reply_to_id
          } as Message));

          setSessions(prev => ({
            ...prev,
            [activeContactId]: {
              ...(prev[activeContactId] || { contactId: activeContactId, messages: [], unreadCount: 0, topic: 'General' }),
              messages: formattedMsgs
            }
          }));
        }

        // Real-time messages
        const messagesSubscription = supabase
          .channel(`public:messages:conv_${convId}`)
          .on('postgres_changes' as any, { 
            event: 'INSERT', 
            schema: 'public',
            table: 'messages', 
            filter: `conversation_id=eq.${convId}` 
          }, (payload: any) => {
            const m = payload.new as any;
            const newMessage: Message = {
              id: m.id,
              senderId: m.sender_id || 'ai-spirit',
              text: m.text,
              imageUrl: m.image_url,
              timestamp: new Date(m.timestamp),
              status: m.status,
              type: m.message_type,
              replyToId: m.reply_to_id
            };
            addMessage(activeContactId, newMessage);
          })
          .subscribe();

        return () => {
          supabase.removeChannel(messagesSubscription);
        };
      }
    };

    fetchMessages();
  }, [user, activeContactId]);

  const handleSelectContact = (id: string) => {
    setActiveContactId(id);
    
    // Reset unread count
    setSessions(prev => ({
      ...prev,
      [id]: {
        ...prev[id],
        unreadCount: 0,
        topic: prev[id]?.topic || 'General',
        // Create session if it doesn't exist (simulated DB upsert)
        ...(prev[id] ? {} : { contactId: id, messages: [], unreadCount: 0, topic: 'General' })
      }
    }));

    if (isMobile) {
      setView(AppView.CHAT_WINDOW);
    }
  };

  const handleTopicChange = (topic: RelationshipTopic) => {
    if (!activeContactId) return;
    setSessions(prev => ({
      ...prev,
      [activeContactId]: {
        ...prev[activeContactId],
        topic
      }
    }));

    // Add a system message about topic change
    const systemMsg: Message = {
      id: `sys-${Date.now()}`,
      senderId: 'system',
      text: `Focus topic changed to: ${topic}`,
      timestamp: new Date(),
      status: 'read',
      type: 'system'
    };
    addMessage(activeContactId, systemMsg);
  };

  const handleToggleGuided = () => {
    if (!activeContactId) return;
    const session = sessions[activeContactId];
    const newIsGuided = !session?.isGuided;

    setSessions(prev => ({
      ...prev,
      [activeContactId]: {
        ...prev[activeContactId],
        isGuided: newIsGuided,
        currentStep: newIsGuided ? 1 : undefined
      }
    }));

    if (newIsGuided) {
      const firstExercise = GUIDED_EXERCISES[0];
      const systemMsg: Message = {
        id: `sys-${Date.now()}`,
        senderId: 'system',
        text: "Guided Session Started: 'Deep Connection Exercise'",
        timestamp: new Date(),
        status: 'read',
        type: 'system'
      };
      addMessage(activeContactId, systemMsg);

      const aiMsg: Message = {
        id: `ai-${Date.now()}`,
        senderId: activeContactId,
        text: firstExercise.prompt,
        timestamp: new Date(),
        status: 'read',
        type: 'text'
      };
      addMessage(activeContactId, aiMsg);
    } else {
      const systemMsg: Message = {
        id: `sys-${Date.now()}`,
        senderId: 'system',
        text: "Guided Session Ended.",
        timestamp: new Date(),
        status: 'read',
        type: 'system'
      };
      addMessage(activeContactId, systemMsg);
    }
  };

  const handleBackToSidebar = () => {
    setActiveContactId(null);
    setView(AppView.CHAT_LIST);
  };

  const handleProfileSave = (newProfile: UserProfile) => {
    setUserProfile(newProfile);
    setView(AppView.CHAT_LIST);
  };

  const handleAddNewContact = async (name: string, avatar?: string) => {
    const newId = `u-${Date.now()}`;
    try {
      const { data, error } = await supabase
        .from('profiles')
        .insert({
          id: newId,
          name,
          avatar_url: avatar || `https://picsum.photos/seed/${newId}/200/200`,
          status: 'offline',
          bio: 'New friend!'
        })
        .select()
        .single();
      
      if (error) throw error;

      const newContact: Contact = {
        id: data.id,
        name: data.name,
        avatar: data.avatar_url,
        status: data.status,
        bio: data.bio
      };

      setContacts(prev => [newContact, ...prev]);
      setSessions(prev => ({
        ...prev,
        [data.id]: { contactId: data.id, messages: [], unreadCount: 0, topic: 'General' }
      }));
      setActiveContactId(data.id);
      if (isMobile) setView(AppView.CHAT_WINDOW);
    } catch (error) {
      console.error("Failed to add contact:", error);
    }
  };

  const addMessage = useCallback((contactId: string, message: Message) => {
    setSessions(prev => {
      const currentSession = prev[contactId] || { contactId, messages: [], unreadCount: 0, topic: 'General' };
      const isViewing = activeContactId === contactId;
      
      return {
        ...prev,
        [contactId]: {
          ...currentSession,
          messages: [...currentSession.messages, message],
          unreadCount: isViewing ? 0 : currentSession.unreadCount + 1
        }
      };
    });

    // Move contact to top of list
    setContacts(prev => {
      const contact = prev.find(c => c.id === contactId);
      if (!contact) return prev;
      const others = prev.filter(c => c.id !== contactId);
      return [contact, ...others];
    });
  }, [activeContactId]);

  const handleAddReaction = (messageId: string, emoji: string) => {
    if (!activeContactId) return;
    setSessions(prev => {
      const session = prev[activeContactId];
      if (!session) return prev;

      const updatedMessages = session.messages.map(m => {
        if (m.id === messageId) {
          const reactions = { ...(m.reactions || {}) };
          const users = [...(reactions[emoji] || [])];
          
          if (users.includes('me')) {
            // Remove reaction
            reactions[emoji] = users.filter(u => u !== 'me');
            if (reactions[emoji].length === 0) delete reactions[emoji];
          } else {
            // Add reaction
            reactions[emoji] = [...users, 'me'];
          }
          
          return { ...m, reactions };
        }
        return m;
      });

      return {
        ...prev,
        [activeContactId]: { ...session, messages: updatedMessages }
      };
    });
  };

  const handleSendMessage = async (text: string, replyToId?: string, imageUrl?: string) => {
    if (!activeContactId || !user) return;

    try {
      // 1. Find or create conversation
      let convId: string | null = null;
      
      const { data: myConvs } = await supabase
        .from('conversation_participants')
        .select('conversation_id')
        .eq('user_id', user.id);
      
      const myConvIds = myConvs?.map(c => c.conversation_id) || [];
      
      const { data: existingParticipant } = await supabase
        .from('conversation_participants')
        .select('conversation_id')
        .in('conversation_id', myConvIds)
        .eq('user_id', activeContactId)
        .single();
      
      if (existingParticipant) {
        convId = existingParticipant.conversation_id;
      } else {
        // Create new conversation
        const { data: newConv, error: convError } = await supabase
          .from('conversations')
          .insert({ topic: sessions[activeContactId]?.topic || 'General' })
          .select()
          .single();
        
        if (convError) throw convError;
        convId = newConv.id;

        // Add participants
        await supabase
          .from('conversation_participants')
          .insert([
            { conversation_id: convId, user_id: user.id },
            { conversation_id: convId, user_id: activeContactId }
          ]);
      }

      const newMessage = {
        conversation_id: convId,
        sender_id: user.id,
        text,
        status: 'sent',
        message_type: imageUrl ? 'image' : 'text',
        image_url: imageUrl || null,
        reply_to_id: replyToId || null
      };

      // 2. Insert message
      const { data: insertedMsg, error: msgError } = await supabase
        .from('messages')
        .insert(newMessage)
        .select()
        .single();
      
      if (msgError) throw msgError;

      // Update conversation last message
      await supabase
        .from('conversations')
        .update({
          last_message: text || 'Sent an image',
          last_message_at: new Date().toISOString()
        })
        .eq('id', convId);

      // Socket typing indicator (optional)
      if (socketRef.current) {
        socketRef.current.emit('send-message', {
          roomId: activeContactId,
          message: {
            id: insertedMsg.id,
            senderId: user.id,
            text,
            imageUrl,
            timestamp: new Date(insertedMsg.timestamp),
            status: 'sent',
            type: imageUrl ? 'image' : 'text',
            replyToId: replyToId || null
          }
        });
      }

      const contact = contacts.find(c => c.id === activeContactId);
      if (!contact) return;

      const session = sessions[activeContactId];

      // Handle AI Reply
      if (contact.isAi) {
        if (socketRef.current) {
          socketRef.current.emit('typing', { roomId: activeContactId, userId: contact.id, isTyping: true });
        }
        
        try {
          let aiResponseText = "";
          
          if (session?.isGuided && session.currentStep !== undefined) {
            const nextStepIdx = session.currentStep; 
            if (nextStepIdx < GUIDED_EXERCISES.length) {
              const nextExercise = GUIDED_EXERCISES[nextStepIdx];
              aiResponseText = nextExercise.prompt;
              setSessions(prev => ({
                ...prev,
                [activeContactId]: {
                  ...prev[activeContactId],
                  currentStep: nextStepIdx + 1
                }
              }));
            } else {
              aiResponseText = "You've completed this guided session! I hope it brought you some clarity. Would you like to talk about anything else?";
              setSessions(prev => ({
                ...prev,
                [activeContactId]: {
                  ...prev[activeContactId],
                  isGuided: false,
                  currentStep: undefined
                }
              }));
            }
          } else {
            const recentMessages = session?.messages.slice(-10) || [];
            const context = recentMessages.map(m => `${m.senderId === user.id ? 'User' : 'AI'}: ${m.text}`).join('\n');
            
            const prompt = `
              Context: You are Kindred Spirit, a friendly, empathetic AI companion.
              Topic: ${session?.topic || 'General'}.
              Recent Conversation:
              ${context}
              
              User just said: "${text}"
              
              Instructions:
              - Respond in a natural, human-like tone.
              - Keep responses short and conversational.
              - Be empathetic and supportive.
              - Use emojis occasionally.
            `;
            aiResponseText = await sendMessageToGemini(prompt);
          }
          
          const typingDelay = Math.min(Math.max(aiResponseText.length * 50, 1000), 4000);
          setTimeout(async () => {
            if (socketRef.current) {
              socketRef.current.emit('typing', { roomId: activeContactId, userId: contact.id, isTyping: false });
            }

            try {
              await supabase
                .from('messages')
                .insert({
                  conversation_id: convId,
                  sender_id: null, // AI messages have null sender
                  text: aiResponseText,
                  status: 'read',
                  message_type: 'system'
                });
            } catch (error) {
              console.error("Failed to send AI message:", error);
            }
          }, typingDelay);

        } catch (err) {
          console.error(err);
          if (socketRef.current) {
            socketRef.current.emit('typing', { roomId: activeContactId, userId: contact.id, isTyping: false });
          }
        }
      }
    } catch (error) {
      console.error("Failed to send message:", error);
    }
  };

  const handleTyping = (isTyping: boolean) => {
    if (!activeContactId || !socketRef.current || !user) return;
    
    // Update status in Supabase
    supabase
      .from('profiles')
      .update({ status: isTyping ? 'typing' : 'online' })
      .eq('id', user.id);

    socketRef.current.emit('typing', {
      roomId: activeContactId,
      userId: user.id,
      isTyping
    });
  };

  const activeContact = contacts.find(c => c.id === activeContactId);
  const activeSession = activeContactId ? sessions[activeContactId] : undefined;

  if (!isSupabaseConfigured) {
    return (
      <div className="h-screen w-screen bg-kindred-900 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-20 h-20 bg-amber-500/20 rounded-2xl flex items-center justify-center mb-6 border border-amber-500/50">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-10 h-10 text-amber-500">
            <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">Configuration Required</h2>
        <p className="text-stone-400 max-w-md mb-8 leading-relaxed">
          Please provide your Supabase URL and Anon Key in the <b>Settings</b> menu to connect your database.
        </p>
        <div className="bg-kindred-800 p-4 rounded-xl border border-white/5 text-left w-full max-w-md">
          <p className="text-xs font-mono text-stone-500 mb-2 uppercase tracking-wider">Required Variables:</p>
          <ul className="space-y-2">
            <li className="flex items-center gap-2 text-stone-300">
              <div className="w-1.5 h-1.5 rounded-full bg-amber-500"></div>
              <code>VITE_SUPABASE_URL</code>
            </li>
            <li className="flex items-center gap-2 text-stone-300">
              <div className="w-1.5 h-1.5 rounded-full bg-amber-500"></div>
              <code>VITE_SUPABASE_ANON_KEY</code>
            </li>
          </ul>
        </div>
      </div>
    );
  }

  if (!isAuthReady) return null;

  if (!user) {
    return (
      <div className="h-screen w-screen bg-kindred-900 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-kindred-800 rounded-3xl p-8 shadow-2xl border border-white/5">
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-kindred-accent rounded-2xl mx-auto mb-4 flex items-center justify-center shadow-lg shadow-kindred-accent/20">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-10 h-10 text-white">
                <path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z" />
                <path d="M12 7v5l3 3" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">
              {isSignUp ? 'Join Kindred' : 'Welcome Back'}
            </h1>
            <p className="text-stone-400">
              {isSignUp ? 'Start your journey to a safe space.' : 'A safe space for your heart.'}
            </p>
          </div>

          <form onSubmit={handleEmailAuth} className="space-y-4">
            {isSignUp && (
              <div className="p-3 bg-kindred-accent/10 border border-kindred-accent/20 rounded-xl text-kindred-accent text-xs mb-4">
                Tip: Use a real email to receive your confirmation link.
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-stone-300 mb-1">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full bg-kindred-900 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-kindred-accent transition-colors"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-300 mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full bg-kindred-900 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-kindred-accent transition-colors"
                placeholder="••••••••"
              />
            </div>

            {authError && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-sm">
                {authError}
              </div>
            )}

            {authMessage && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-500 text-sm">
                {authMessage}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-kindred-accent text-white font-bold py-3 rounded-xl hover:bg-kindred-accentHover transition-all shadow-lg shadow-kindred-accent/20 disabled:opacity-50"
            >
              {isLoading ? 'Processing...' : isSignUp ? 'Create Account' : 'Sign In'}
            </button>
          </form>

          <div className="mt-6 flex items-center gap-4">
            <div className="h-px flex-1 bg-white/10"></div>
            <span className="text-stone-500 text-sm">OR</span>
            <div className="h-px flex-1 bg-white/10"></div>
          </div>

          <button
            onClick={handleGoogleLogin}
            className="w-full mt-6 bg-white text-kindred-900 font-bold py-3 rounded-xl hover:bg-stone-100 transition-all flex items-center justify-center gap-3"
          >
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
            Continue with Google
          </button>

          <p className="mt-8 text-center text-stone-400 text-sm">
            {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
            <button
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-kindred-accent font-bold hover:underline"
            >
              {isSignUp ? 'Sign In' : 'Sign Up'}
            </button>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-kindred-900 text-stone-200 font-sans selection:bg-kindred-accent selection:text-kindred-900">
      <AnimatePresence>
        {view === AppView.ONBOARDING && (
          <Onboarding onComplete={handleOnboardingComplete} />
        )}
      </AnimatePresence>

      {/* Sidebar - Visible on Desktop or Mobile List View */}
      <div className={`
        ${isMobile ? (view === AppView.CHAT_LIST || view === AppView.PROFILE ? 'w-full' : 'hidden') : 'w-[350px] lg:w-[400px] flex-shrink-0'}
        h-full relative
      `}>
        {userProfile && (
          <Sidebar 
            contacts={contacts}
            sessions={sessions}
            activeContactId={activeContactId}
            onSelectContact={handleSelectContact}
            userProfile={userProfile}
            onOpenProfile={() => setView(AppView.PROFILE)}
            onAddNewContact={handleAddNewContact}
            onSignOut={handleSignOut}
          />
        )}
        <AnimatePresence>
          {view === AppView.PROFILE && userProfile && (
            <ProfileEdit 
              profile={userProfile}
              onSave={handleProfileSave}
              onBack={() => setView(AppView.CHAT_LIST)}
            />
          )}
        </AnimatePresence>
      </div>

      {/* Main Chat Area */}
      <div className={`
        ${isMobile ? (view === AppView.CHAT_WINDOW ? 'w-full fixed inset-0 z-50' : 'hidden') : 'flex-1'}
        h-full flex flex-col relative
      `}>
        {activeContact && activeSession ? (
          <ChatWindow 
            contact={activeContact}
            messages={activeSession.messages}
            onSendMessage={handleSendMessage}
            onTyping={handleTyping}
            onBack={handleBackToSidebar}
            isTyping={activeContact.status === 'typing'}
            activeTopic={activeSession.topic || 'General'}
            onTopicChange={handleTopicChange}
            isGuided={activeSession.isGuided || false}
            onToggleGuided={handleToggleGuided}
            onAddReaction={handleAddReaction}
          />
        ) : (
          /* Empty State for Desktop */
          <div className="hidden md:flex flex-col items-center justify-center h-full bg-kindred-900 bg-grid-pattern border-l border-kindred-700/50">
             <div className="w-24 h-24 bg-kindred-800 rounded-full flex items-center justify-center mb-6 shadow-2xl border border-kindred-700 relative">
               <div className="animate-pulse">
                  <div className="w-12 h-12 bg-kindred-accent rounded-full opacity-20"></div>
               </div>
               <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-10 h-10 text-kindred-accent">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>
                  </div>
               </div>
             </div>
             <h1 className="text-3xl font-bold text-stone-100 mb-2 tracking-tight">Welcome to Kindred</h1>
             <p className="text-stone-400 max-w-md text-center leading-relaxed">
               Pick a friend to start a warm talk. <br/>
               Chat with <span className="text-kindred-accent font-semibold">Kindred Spirit</span> for advice and support.
             </p>
             <div className="mt-8 text-xs text-stone-600 font-mono">
                A safe space for your heart • v1.2.0
             </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;