import React, { useState, useEffect, useCallback, useRef } from 'react';
import Sidebar from './components/Sidebar';
import ChatWindow from './components/ChatWindow';
import ProfileEdit from './components/ProfileEdit';
import Onboarding from './components/Onboarding';
import { contacts as initialContacts, initialSessions } from './services/mockDb';
import { Contact, ChatSession, Message, AppView, UserProfile, RelationshipTopic } from './types';
import { sendMessageToGemini } from './services/geminiService';
import { INITIAL_USER_ID, GUIDED_EXERCISES } from './constants';
import { AnimatePresence } from 'motion/react';
import { io, Socket } from 'socket.io-client';

const App: React.FC = () => {
  const [activeContactId, setActiveContactId] = useState<string | null>(null);
  const [sessions, setSessions] = useState<Record<string, ChatSession>>(initialSessions);
  const [contacts, setContacts] = useState<Contact[]>(initialContacts);
  const [view, setView] = useState<AppView>(AppView.ONBOARDING);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [userProfile, setUserProfile] = useState<UserProfile>({
    name: 'Me',
    avatar: 'https://picsum.photos/id/338/200/200',
    bio: 'A safe space for my heart.'
  });

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

  // Check if onboarding was completed
  useEffect(() => {
    const completed = localStorage.getItem('kindred_onboarding_completed');
    if (completed) {
      setView(AppView.CHAT_LIST);
    }
  }, []);

  const handleOnboardingComplete = () => {
    localStorage.setItem('kindred_onboarding_completed', 'true');
    setView(AppView.CHAT_LIST);
  };

  // Responsive check
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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
    if (!activeContactId || !socketRef.current) return;

    const newMessage: Message = {
      id: Date.now().toString(),
      senderId: INITIAL_USER_ID,
      text,
      timestamp: new Date(),
      status: 'sent',
      type: 'text',
      replyToId
    };

    addMessage(activeContactId, newMessage);
    
    // Emit message via socket
    socketRef.current.emit('send-message', {
      roomId: activeContactId,
      message: newMessage
    });

    const contact = contacts.find(c => c.id === activeContactId);
    if (!contact) return;

    const session = sessions[activeContactId];

    // Simulate "Delivered" -> "Read" update
    setTimeout(() => {
      setSessions(prev => ({
        ...prev,
        [activeContactId]: {
          ...prev[activeContactId],
          messages: prev[activeContactId].messages.map(m => 
            m.id === newMessage.id ? { ...m, status: 'delivered' } : m
          )
        }
      }));
    }, 1000);

    setTimeout(() => {
      setSessions(prev => ({
        ...prev,
        [activeContactId]: {
          ...prev[activeContactId],
          messages: prev[activeContactId].messages.map(m => 
            m.id === newMessage.id ? { ...m, status: 'read' } : m
          )
        }
      }));
    }, 2000);

    // Handle AI Reply
    if (contact.isAi) {
      // Emit typing via socket
      socketRef.current.emit('typing', { roomId: activeContactId, userId: contact.id, isTyping: true });
      setContacts(prev => prev.map(c => c.id === activeContactId ? { ...c, status: 'typing' } : c));
      
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
          // Get conversation context
          const recentMessages = session?.messages.slice(-10) || [];
          const context = recentMessages.map(m => `${m.senderId === INITIAL_USER_ID ? 'User' : 'AI'}: ${m.text}`).join('\n');
          
          const prompt = `
            Context: You are Kindred Spirit, a friendly, empathetic AI companion.
            Topic: ${session?.topic || 'General'}.
            Recent Conversation:
            ${context}
            
            User just said: "${text}"
            
            Instructions:
            - Respond in a natural, human-like tone.
            - Keep responses short and conversational (like a real chat message).
            - Be empathetic and supportive.
            - Use emojis occasionally.
            - Avoid robotic or overly formal language.
            - If the user asks "what are you doing?", you might say "Just chilling and thinking about our chat! How about you?"
          `;
          aiResponseText = await sendMessageToGemini(prompt);
        }
        
        // Simulate typing delay
        const typingDelay = Math.min(Math.max(aiResponseText.length * 50, 1000), 4000);
        setTimeout(() => {
          socketRef.current?.emit('typing', { roomId: activeContactId, userId: contact.id, isTyping: false });
          setContacts(prev => prev.map(c => c.id === activeContactId ? { ...c, status: 'online' } : c));

          const replyMessage: Message = {
            id: (Date.now() + 1).toString(),
            senderId: contact.id,
            text: aiResponseText,
            timestamp: new Date(),
            status: 'read',
            type: 'text'
          };
          addMessage(activeContactId, replyMessage);
          
          // Emit AI message via socket (so other tabs/clients see it if applicable)
          socketRef.current?.emit('send-message', {
            roomId: activeContactId,
            message: replyMessage
          });
        }, typingDelay);

      } catch (err) {
        console.error(err);
        socketRef.current?.emit('typing', { roomId: activeContactId, userId: contact.id, isTyping: false });
        setContacts(prev => prev.map(c => c.id === activeContactId ? { ...c, status: 'online' } : c));
      }

    } else {
      // Simple mock reply for non-AI contacts
      setTimeout(() => {
        socketRef.current?.emit('typing', { roomId: activeContactId, userId: contact.id, isTyping: true });
        setContacts(prev => prev.map(c => c.id === activeContactId ? { ...c, status: 'typing' } : c));
        
        setTimeout(() => {
          socketRef.current?.emit('typing', { roomId: activeContactId, userId: contact.id, isTyping: false });
          setContacts(prev => prev.map(c => c.id === activeContactId ? { ...c, status: 'online' } : c));
          const replyMessage: Message = {
            id: (Date.now() + 1).toString(),
            senderId: contact.id,
            text: `That sounds interesting! Tell me more about "${text.substring(0, 10)}..."`,
            timestamp: new Date(),
            status: 'read',
            type: 'text'
          };
          addMessage(activeContactId, replyMessage);
          
          socketRef.current?.emit('send-message', {
            roomId: activeContactId,
            message: replyMessage
          });
        }, 3000); 
      }, 1000); 
    }
  };

  const handleTyping = (isTyping: boolean) => {
    if (!activeContactId || !socketRef.current) return;
    socketRef.current.emit('typing', {
      roomId: activeContactId,
      userId: INITIAL_USER_ID,
      isTyping
    });
  };

  const activeContact = contacts.find(c => c.id === activeContactId);
  const activeSession = activeContactId ? sessions[activeContactId] : undefined;

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
        <Sidebar 
          contacts={contacts}
          sessions={sessions}
          activeContactId={activeContactId}
          onSelectContact={handleSelectContact}
          userProfile={userProfile}
          onOpenProfile={() => setView(AppView.PROFILE)}
          onAddNewContact={handleAddNewContact}
        />
        <AnimatePresence>
          {view === AppView.PROFILE && (
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