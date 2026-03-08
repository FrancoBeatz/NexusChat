import React, { useState, useEffect, useCallback } from 'react';
import Sidebar from './components/Sidebar';
import ChatWindow from './components/ChatWindow';
import ProfileEdit from './components/ProfileEdit';
import { contacts as initialContacts, initialSessions } from './services/mockDb';
import { Contact, ChatSession, Message, AppView, UserProfile } from './types';
import { sendMessageToGemini } from './services/geminiService';
import { INITIAL_USER_ID } from './constants';
import { AnimatePresence } from 'motion/react';

const App: React.FC = () => {
  const [activeContactId, setActiveContactId] = useState<string | null>(null);
  const [sessions, setSessions] = useState<Record<string, ChatSession>>(initialSessions);
  const [contacts, setContacts] = useState<Contact[]>(initialContacts);
  const [view, setView] = useState<AppView>(AppView.CHAT_LIST);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [userProfile, setUserProfile] = useState<UserProfile>({
    name: 'Me',
    avatar: 'https://picsum.photos/id/338/200/200',
    bio: 'A safe space for my heart.'
  });

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
        // Create session if it doesn't exist (simulated DB upsert)
        ...(prev[id] ? {} : { contactId: id, messages: [], unreadCount: 0 })
      }
    }));

    if (isMobile) {
      setView(AppView.CHAT_WINDOW);
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
      [newId]: { contactId: newId, messages: [], unreadCount: 0 }
    }));
    setActiveContactId(newId);
    if (isMobile) setView(AppView.CHAT_WINDOW);
  };

  const addMessage = useCallback((contactId: string, message: Message) => {
    setSessions(prev => {
      const currentSession = prev[contactId] || { contactId, messages: [], unreadCount: 0 };
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

  const handleSendMessage = async (text: string) => {
    if (!activeContactId) return;

    const newMessage: Message = {
      id: Date.now().toString(),
      senderId: INITIAL_USER_ID,
      text,
      timestamp: new Date(),
      status: 'sent',
      type: 'text'
    };

    addMessage(activeContactId, newMessage);

    // Simulate Network / AI Response
    const contact = contacts.find(c => c.id === activeContactId);
    if (!contact) return;

    // Simulate "Sent" -> "Delivered" -> "Read" update
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

    // Handle Reply
    if (contact.isAi) {
      // AI Typing simulation
      setContacts(prev => prev.map(c => c.id === activeContactId ? { ...c, status: 'typing' } : c));
      
      try {
        const aiResponseText = await sendMessageToGemini(text);
        
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
      } catch (err) {
        console.error(err);
        setContacts(prev => prev.map(c => c.id === activeContactId ? { ...c, status: 'online' } : c));
      }

    } else {
      // Simple mock reply for non-AI contacts
      setTimeout(() => {
        setContacts(prev => prev.map(c => c.id === activeContactId ? { ...c, status: 'typing' } : c));
        
        setTimeout(() => {
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
        }, 3000); // 3s typing duration
      }, 1000); // 1s delay before read
    }
  };

  const activeContact = contacts.find(c => c.id === activeContactId);
  const activeSession = activeContactId ? sessions[activeContactId] : undefined;

  // Initial welcome message from AI if empty
  useEffect(() => {
    // Check if user has API key, if not maybe show a warning?
    // For this demo we assume it works or fails gracefully in service.
  }, []);

  return (
    <div className="flex h-screen overflow-hidden bg-kindred-900 text-stone-200 font-sans selection:bg-kindred-accent selection:text-kindred-900">
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
            onBack={handleBackToSidebar}
            isTyping={activeContact.status === 'typing'}
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
                A safe space for your heart • v1.1.0
             </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;