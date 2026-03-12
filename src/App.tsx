import React, { useState, useEffect, useCallback, useRef } from 'react';
import Sidebar from './components/Sidebar';
import ChatWindow from './components/ChatWindow';
import ProfileEdit from './components/ProfileEdit';
import Onboarding from './components/Onboarding';
import { auth, db, googleProvider, signInWithPopup, onAuthStateChanged, collection, doc, setDoc, getDoc, onSnapshot, query, orderBy, limit, addDoc, Timestamp, User } from './firebase';
import { Contact, ChatSession, Message, AppView, UserProfile, RelationshipTopic } from './types';
import { sendMessageToGemini } from './services/geminiService';
import { INITIAL_USER_ID, GUIDED_EXERCISES } from './constants';
import { AnimatePresence } from 'motion/react';
import { io, Socket } from 'socket.io-client';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [activeContactId, setActiveContactId] = useState<string | null>(null);
  const [sessions, setSessions] = useState<Record<string, ChatSession>>({});
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [view, setView] = useState<AppView>(AppView.ONBOARDING);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

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
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        // Fetch or create user profile in Firestore
        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
        if (userDoc.exists()) {
          setUserProfile(userDoc.data() as UserProfile);
          setView(AppView.CHAT_LIST);
        } else {
          // New user, stay on onboarding
          setView(AppView.ONBOARDING);
        }
      } else {
        setView(AppView.ONBOARDING);
      }
      setIsAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Login failed:", error);
    }
  };

  const handleOnboardingComplete = async (profile: UserProfile) => {
    if (!user) return;
    try {
      await setDoc(doc(db, 'users', user.uid), {
        ...profile,
        id: user.uid,
        uid: user.uid,
        status: 'online',
        lastSeen: new Date().toISOString()
      });
      setUserProfile(profile);
      setView(AppView.CHAT_LIST);
    } catch (error) {
      console.error("Failed to save profile:", error);
    }
  };

  // Fetch Contacts and Conversations
  useEffect(() => {
    if (!user) return;

    // Listen to users collection for contacts
    const unsubscribeUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      const usersList = snapshot.docs
        .map(doc => doc.data() as Contact)
        .filter(u => u.id !== user.uid); // Exclude self
      
      // Add Kindred Spirit AI if not present
      const aiContact: Contact = {
        id: 'ai-spirit',
        name: 'Kindred Spirit',
        avatar: 'https://picsum.photos/seed/kindred/200/200',
        status: 'online',
        isAi: true,
        bio: 'Your empathetic AI companion.'
      };
      
      setContacts([aiContact, ...usersList]);
    });

    // Listen to conversations
    const unsubscribeConvs = onSnapshot(collection(db, 'conversations'), (snapshot) => {
      const convs: Record<string, ChatSession> = {};
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        if (data.participants.includes(user.uid)) {
          const otherParticipant = data.participants.find((p: string) => p !== user.uid) || 'ai-spirit';
          convs[otherParticipant] = {
            contactId: otherParticipant,
            messages: [], // Messages will be fetched separately
            unreadCount: 0,
            topic: data.topic || 'General'
          };
        }
      });
      setSessions(prev => ({ ...prev, ...convs }));
    });

    return () => {
      unsubscribeUsers();
      unsubscribeConvs();
    };
  }, [user]);

  // Fetch Messages for active contact
  useEffect(() => {
    if (!user || !activeContactId) return;

    const convId = [user.uid, activeContactId].sort().join('_');
    const q = query(collection(db, `conversations/${convId}/messages`), orderBy('timestamp', 'asc'));

    const unsubscribeMessages = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          ...data,
          timestamp: data.timestamp?.toDate() || new Date()
        } as Message;
      });

      setSessions(prev => ({
        ...prev,
        [activeContactId]: {
          ...(prev[activeContactId] || { contactId: activeContactId, messages: [], unreadCount: 0, topic: 'General' }),
          messages: msgs
        }
      }));
    });

    return () => unsubscribeMessages();
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

  const handleAddNewContact = (name: string, avatar?: string) => {
    const newId = `u-${Date.now()}`;
    const newContact: Contact = {
      id: newId,
      name,
      avatar: avatar || `https://picsum.photos/seed/${newId}/200/200`,
      status: 'offline',
      bio: 'New friend!'
    };
    setContacts(prev => [newContact, ...prev]);
    setSessions(prev => ({
      ...prev,
      [newId]: { contactId: newId, messages: [], unreadCount: 0, topic: 'General' }
    }));
    setActiveContactId(newId);
    if (isMobile) setView(AppView.CHAT_WINDOW);
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

  const handleSendMessage = async (text: string, replyToId?: string) => {
    if (!activeContactId || !user) return;

    const convId = [user.uid, activeContactId].sort().join('_');
    const messagesRef = collection(db, `conversations/${convId}/messages`);

    const newMessage = {
      senderId: user.uid,
      text,
      timestamp: Timestamp.now(),
      status: 'sent',
      type: 'text',
      replyToId: replyToId || null
    };

    try {
      // Ensure conversation exists
      await setDoc(doc(db, 'conversations', convId), {
        id: convId,
        participants: [user.uid, activeContactId],
        lastMessage: text,
        lastMessageAt: Timestamp.now(),
        topic: sessions[activeContactId]?.topic || 'General'
      }, { merge: true });

      await addDoc(messagesRef, newMessage);
      
      // Socket typing indicator (optional, since we use Firestore for messages)
      if (socketRef.current) {
        socketRef.current.emit('send-message', {
          roomId: activeContactId,
          message: { ...newMessage, id: Date.now().toString(), timestamp: new Date() }
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
            const context = recentMessages.map(m => `${m.senderId === user.uid ? 'User' : 'AI'}: ${m.text}`).join('\n');
            
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

            await addDoc(messagesRef, {
              senderId: contact.id,
              text: aiResponseText,
              timestamp: Timestamp.now(),
              status: 'read',
              type: 'text'
            });
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
    socketRef.current.emit('typing', {
      roomId: activeContactId,
      userId: user.uid,
      isTyping
    });
  };

  const activeContact = contacts.find(c => c.id === activeContactId);
  const activeSession = activeContactId ? sessions[activeContactId] : undefined;

  if (!isAuthReady) return null;

  if (!user) {
    return (
      <div className="h-screen w-screen bg-kindred-900 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-24 h-24 bg-kindred-800 rounded-full flex items-center justify-center mb-8 shadow-2xl border border-kindred-700">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-12 h-12 text-kindred-accent">
            <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>
          </svg>
        </div>
        <h1 className="text-4xl font-bold text-white mb-4 tracking-tight">Kindred</h1>
        <p className="text-stone-400 max-w-sm mb-10 leading-relaxed">
          A safe space for your heart. Connect with friends and your empathetic AI companion.
        </p>
        <button 
          onClick={handleLogin}
          className="bg-white text-kindred-900 font-bold px-8 py-4 rounded-xl flex items-center gap-3 hover:bg-stone-100 transition-all transform active:scale-95 shadow-xl"
        >
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-6 h-6" />
          Sign in with Google
        </button>
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