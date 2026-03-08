import React, { useState } from 'react';
import { Contact, ChatSession } from '../types';
import { ICONS } from '../constants';

interface SidebarProps {
  contacts: Contact[];
  sessions: Record<string, ChatSession>;
  activeContactId: string | null;
  onSelectContact: (id: string) => void;
  className?: string;
}

const Sidebar: React.FC<SidebarProps> = ({ 
  contacts, 
  sessions, 
  activeContactId, 
  onSelectContact,
  className = ''
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredContacts = contacts.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getLastMessage = (contactId: string) => {
    const session = sessions[contactId];
    if (!session || session.messages.length === 0) return null;
    return session.messages[session.messages.length - 1];
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className={`flex flex-col h-full border-r border-kindred-700 bg-kindred-900 ${className}`}>
      {/* Header */}
      <div className="p-4 bg-kindred-800 border-b border-kindred-700 flex justify-between items-center sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-kindred-accent to-pink-500 p-0.5">
             <img 
               src="https://picsum.photos/id/338/200/200" 
               alt="My Profile" 
               className="w-full h-full rounded-full object-cover border-2 border-kindred-900"
             />
          </div>
          <span className="font-semibold text-white tracking-wide">Friends</span>
        </div>
        <div className="flex gap-4 text-kindred-accent">
           <ICONS.MessageSquare className="w-5 h-5 cursor-pointer hover:text-white transition-colors" />
           <ICONS.MoreVertical className="w-5 h-5 cursor-pointer hover:text-white transition-colors" />
        </div>
      </div>

      {/* Search */}
      <div className="p-3">
        <div className="relative">
          <ICONS.Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-stone-400" />
          <input 
            type="text" 
            placeholder="Find a friend..." 
            className="w-full bg-kindred-800 text-sm text-stone-200 rounded-lg pl-10 pr-4 py-2 focus:outline-none focus:ring-1 focus:ring-kindred-accent transition-all placeholder-stone-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Contact List */}
      <div className="flex-1 overflow-y-auto">
        {filteredContacts.map(contact => {
          const lastMsg = getLastMessage(contact.id);
          const session = sessions[contact.id];
          const isActive = activeContactId === contact.id;

          return (
            <div 
              key={contact.id}
              onClick={() => onSelectContact(contact.id)}
              className={`flex items-center gap-3 p-3 cursor-pointer transition-colors border-b border-kindred-800/50 hover:bg-kindred-800/50 ${isActive ? 'bg-kindred-800 border-l-4 border-l-kindred-accent' : 'border-l-4 border-l-transparent'}`}
            >
              <div className="relative flex-shrink-0">
                <img 
                  src={contact.avatar} 
                  alt={contact.name} 
                  className="w-12 h-12 rounded-full object-cover bg-kindred-700"
                />
                {contact.isAi && (
                  <div className="absolute -bottom-1 -right-1 bg-kindred-900 rounded-full p-0.5">
                     <ICONS.Heart className="w-4 h-4 text-kindred-accent fill-current" />
                  </div>
                )}
                {contact.status === 'online' && !contact.isAi && (
                  <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-kindred-900"></div>
                )}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-baseline mb-0.5">
                  <h3 className={`font-medium truncate ${isActive ? 'text-kindred-accent' : 'text-stone-200'}`}>
                    {contact.name}
                  </h3>
                  {lastMsg && (
                    <span className="text-xs text-stone-500 font-mono">
                      {formatTime(lastMsg.timestamp)}
                    </span>
                  )}
                </div>
                <div className="flex justify-between items-center">
                  <p className="text-sm text-stone-400 truncate pr-2">
                    {contact.status === 'typing' ? (
                       <span className="text-kindred-accent animate-pulse">Typing...</span>
                    ) : (
                      lastMsg ? lastMsg.text : <span className="italic text-stone-600">No messages yet</span>
                    )}
                  </p>
                  {session && session.unreadCount > 0 && (
                    <span className="flex-shrink-0 bg-kindred-accent text-kindred-900 text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[1.25rem] text-center">
                      {session.unreadCount}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Sidebar;