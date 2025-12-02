import React, { useRef, useEffect } from 'react';
import { Contact, Message } from '../types';
import { ICONS } from '../constants';
import MessageInput from './MessageInput';

interface ChatWindowProps {
  contact: Contact;
  messages: Message[];
  onSendMessage: (text: string) => void;
  onBack: () => void;
  isTyping?: boolean;
}

const ChatWindow: React.FC<ChatWindowProps> = ({ 
  contact, 
  messages, 
  onSendMessage, 
  onBack,
  isTyping
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const renderMessageStatus = (status: Message['status']) => {
    if (status === 'sent') return <ICONS.Check className="w-3 h-3 text-slate-400" />;
    if (status === 'delivered') return <ICONS.CheckCheck className="w-3 h-3 text-slate-400" />;
    if (status === 'read') return <ICONS.CheckCheck className="w-3 h-3 text-nexus-accent" />;
    return null;
  };

  // Group messages by date could be added here, but keeping it simple for now
  
  return (
    <div className="flex flex-col h-full bg-nexus-900 relative">
      <div className="absolute inset-0 bg-grid-pattern opacity-10 pointer-events-none"></div>

      {/* Header */}
      <div className="p-3 px-4 bg-nexus-800/90 backdrop-blur-md border-b border-nexus-700 flex justify-between items-center z-10 sticky top-0 shadow-sm">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="md:hidden text-slate-300 hover:text-white mr-1">
            <ICONS.ArrowLeft className="w-6 h-6" />
          </button>
          
          <div className="relative">
             <img 
               src={contact.avatar} 
               alt={contact.name} 
               className="w-10 h-10 rounded-full object-cover ring-2 ring-nexus-900"
             />
             {contact.isAi && (
                <div className="absolute -bottom-1 -right-1 bg-nexus-900 rounded-full p-0.5">
                   <ICONS.Cpu className="w-3 h-3 text-nexus-accent fill-current" />
                </div>
              )}
          </div>
          
          <div className="flex flex-col">
            <h2 className="font-semibold text-slate-100 leading-tight flex items-center gap-2">
              {contact.name}
              {contact.isAi && <span className="text-[10px] bg-nexus-700 text-nexus-accent px-1.5 py-0.5 rounded uppercase tracking-wider font-bold">Bot</span>}
            </h2>
            <span className="text-xs text-nexus-accent truncate">
              {isTyping ? 'typing...' : contact.status === 'online' ? 'online' : `last seen ${contact.lastSeen || 'recently'}`}
            </span>
          </div>
        </div>

        <div className="flex gap-5 text-nexus-accent">
          <ICONS.Video className="w-5 h-5 cursor-pointer hover:text-white transition-colors" />
          <ICONS.Phone className="w-5 h-5 cursor-pointer hover:text-white transition-colors" />
          <ICONS.MoreVertical className="w-5 h-5 cursor-pointer hover:text-white transition-colors" />
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 custom-scrollbar z-0 relative">
        <div className="flex justify-center mb-6">
            <span className="bg-nexus-800 text-slate-400 text-xs py-1 px-3 rounded-full border border-nexus-700 font-mono uppercase tracking-widest opacity-70 shadow-sm">
              Today
            </span>
        </div>

        {messages.map((msg) => {
          const isMe = msg.senderId === 'me';
          return (
            <div 
              key={msg.id} 
              className={`flex ${isMe ? 'justify-end' : 'justify-start'} group`}
            >
              <div 
                className={`
                  max-w-[85%] md:max-w-[65%] rounded-2xl px-4 py-2 shadow-md relative
                  ${isMe 
                    ? 'bg-nexus-msgOut text-white rounded-tr-none' 
                    : 'bg-nexus-msgIn text-slate-200 border border-nexus-700 rounded-tl-none'
                  }
                `}
              >
                {/* Tail for bubble */}
                <div className={`absolute top-0 w-3 h-3 ${isMe ? '-right-2' : '-left-2'} overflow-hidden`}>
                   <div className={`w-4 h-4 transform rotate-45 origin-center mt-1 ${isMe ? 'bg-nexus-msgOut -translate-x-3' : 'bg-nexus-msgIn border-t border-l border-nexus-700 translate-x-3'}`}></div>
                </div>

                <p className="text-sm md:text-[15px] leading-relaxed whitespace-pre-wrap break-words relative z-10">
                  {msg.text}
                </p>
                
                <div className={`flex items-center justify-end gap-1 mt-1 ${isMe ? 'text-cyan-200' : 'text-slate-500'}`}>
                  <span className="text-[10px] font-mono opacity-80">
                    {formatTime(msg.timestamp)}
                  </span>
                  {isMe && renderMessageStatus(msg.status)}
                </div>
              </div>
            </div>
          );
        })}
        {isTyping && (
           <div className="flex justify-start animate-fade-in">
              <div className="bg-nexus-msgIn border border-nexus-700 rounded-2xl rounded-tl-none px-4 py-3 shadow-md flex items-center gap-1.5">
                  <div className="w-2 h-2 bg-nexus-accent rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-2 h-2 bg-nexus-accent rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-2 h-2 bg-nexus-accent rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
           </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="z-10 relative">
        <MessageInput onSendMessage={onSendMessage} />
      </div>
    </div>
  );
};

export default ChatWindow;