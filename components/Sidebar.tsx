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
    <div className={`flex flex-col h-full border-r border-nexus-700 bg-nexus-900 ${className}`}>
      {/* Header */}
      <div className="p-4 bg-nexus-800 border-b border-nexus-700 flex justify-between items-center sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-nexus-accent to-purple-500 p-0.5">
             <img 
               src="https://picsum.photos/id/338/200/200" 
               alt="My Profile" 
               className="w-full h-full rounded-full object-cover border-2 border-nexus-900"
             />
          </div>
          <span className="font-semibold text-white tracking-wide">Chats</span>
        </div>
        <div className="flex gap-4 text-nexus-accent">
           <ICONS.MessageSquare className="w-5 h-5 cursor-pointer hover:text-white transition-colors" />
           <ICONS.MoreVertical className="w-5 h-5 cursor-pointer hover:text-white transition-colors" />
        </div>
      </div>

      {/* Search */}
      <div className="p-3">
        <div className="relative">
          <ICONS.Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search or start new chat" 
            className="w-full bg-nexus-800 text-sm text-slate-200 rounded-lg pl-10 pr-4 py-2 focus:outline-none focus:ring-1 focus:ring-nexus-accent transition-all placeholder-slate-500"
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
              className={`flex items-center gap-3 p-3 cursor-pointer transition-colors border-b border-nexus-800/50 hover:bg-nexus-800/50 ${isActive ? 'bg-nexus-800 border-l-4 border-l-nexus-accent' : 'border-l-4 border-l-transparent'}`}
            >
              <div className="relative flex-shrink-0">
                <img 
                  src={contact.avatar} 
                  alt={contact.name} 
                  className="w-12 h-12 rounded-full object-cover bg-nexus-700"
                />
                {contact.isAi && (
                  <div className="absolute -bottom-1 -right-1 bg-nexus-900 rounded-full p-0.5">
                     <ICONS.Cpu className="w-4 h-4 text-nexus-accent fill-current" />
                  </div>
                )}
                {contact.status === 'online' && !contact.isAi && (
                  <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-nexus-900"></div>
                )}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-baseline mb-0.5">
                  <h3 className={`font-medium truncate ${isActive ? 'text-nexus-accent' : 'text-slate-200'}`}>
                    {contact.name}
                  </h3>
                  {lastMsg && (
                    <span className="text-xs text-slate-500 font-mono">
                      {formatTime(lastMsg.timestamp)}
                    </span>
                  )}
                </div>
                <div className="flex justify-between items-center">
                  <p className="text-sm text-slate-400 truncate pr-2">
                    {contact.status === 'typing' ? (
                       <span className="text-nexus-accent animate-pulse">Typing...</span>
                    ) : (
                      lastMsg ? lastMsg.text : <span className="italic text-slate-600">No messages yet</span>
                    )}
                  </p>
                  {session && session.unreadCount > 0 && (
                    <span className="flex-shrink-0 bg-nexus-accent text-nexus-900 text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[1.25rem] text-center">
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