import React, { useRef, useEffect, useState } from 'react';
import { Contact, Message, RelationshipTopic } from '../types';
import { ICONS, CONVERSATION_STARTERS } from '../constants';
import MessageInput from './MessageInput';
import { motion, AnimatePresence } from 'motion/react';

interface ChatWindowProps {
  contact: Contact;
  messages: Message[];
  onSendMessage: (text: string) => void;
  onBack: () => void;
  isTyping?: boolean;
  activeTopic: RelationshipTopic;
  onTopicChange: (topic: RelationshipTopic) => void;
  isGuided: boolean;
  onToggleGuided: () => void;
}

const ChatWindow: React.FC<ChatWindowProps> = ({ 
  contact, 
  messages, 
  onSendMessage, 
  onBack,
  isTyping,
  activeTopic,
  onTopicChange,
  isGuided,
  onToggleGuided
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [showTopics, setShowTopics] = useState(false);

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
    return (
      <div className="flex items-center">
        <AnimatePresence mode="wait">
          {status === 'sent' && (
            <motion.div
              key="sent"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
            >
              <ICONS.Check className="w-3.5 h-3.5 text-stone-400" />
            </motion.div>
          )}
          {status === 'delivered' && (
            <motion.div
              key="delivered"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
            >
              <ICONS.CheckCheck className="w-3.5 h-3.5 text-stone-400" />
            </motion.div>
          )}
          {status === 'read' && (
            <motion.div
              key="read"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
            >
              <ICONS.CheckCheck className="w-3.5 h-3.5 text-kindred-accent drop-shadow-[0_0_2px_rgba(244,63,94,0.5)]" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  const topics: RelationshipTopic[] = ['General', 'Dating', 'Friendship', 'Family', 'Self-care'];

  return (
    <div className="flex flex-col h-full bg-kindred-900 relative">
      <div className="absolute inset-0 bg-grid-pattern opacity-10 pointer-events-none"></div>

      {/* Header */}
      <div className="p-3 px-4 bg-kindred-800/90 backdrop-blur-md border-b border-kindred-700 flex justify-between items-center z-10 sticky top-0 shadow-sm">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="md:hidden text-stone-300 hover:text-white mr-1">
            <ICONS.ArrowLeft className="w-6 h-6" />
          </button>
          
          <div className="relative">
             <img 
               src={contact.avatar} 
               alt={contact.name} 
               className="w-10 h-10 rounded-full object-cover ring-2 ring-kindred-900"
             />
             {contact.isAi && (
                <div className="absolute -bottom-1 -right-1 bg-kindred-900 rounded-full p-0.5">
                   <ICONS.Heart className="w-3 h-3 text-kindred-accent fill-current" />
                </div>
              )}
          </div>
          
          <div className="flex flex-col">
            <h2 className="font-semibold text-stone-100 leading-tight flex items-center gap-2">
              {contact.name}
              {contact.isAi && <span className="text-[10px] bg-kindred-700 text-kindred-accent px-1.5 py-0.5 rounded uppercase tracking-wider font-bold">Soul</span>}
            </h2>
            <div className="flex items-center gap-2">
              <span className="text-xs text-kindred-accent truncate">
                {isTyping ? 'typing...' : contact.status === 'online' ? 'online' : `last seen ${contact.lastSeen || 'recently'}`}
              </span>
              {contact.isAi && (
                <button 
                  onClick={() => setShowTopics(!showTopics)}
                  className="text-[10px] text-stone-400 hover:text-white flex items-center gap-1 bg-stone-800 px-1.5 py-0.5 rounded"
                >
                  {activeTopic} <ICONS.Settings className="w-2.5 h-2.5" />
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="flex gap-4 text-kindred-accent items-center">
          {contact.isAi && (
            <button 
              onClick={onToggleGuided}
              className={`text-xs px-3 py-1.5 rounded-full font-bold transition-all ${isGuided ? 'bg-kindred-accent text-white shadow-lg shadow-kindred-accent/30' : 'bg-stone-800 text-stone-400 hover:text-white'}`}
            >
              {isGuided ? 'Guided Mode ON' : 'Start Guided Session'}
            </button>
          )}
          <ICONS.MoreVertical className="w-5 h-5 cursor-pointer hover:text-white transition-colors" />
        </div>
      </div>

      {/* Topic Selection Overlay */}
      <AnimatePresence>
        {showTopics && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-16 left-4 right-4 bg-kindred-800 border border-kindred-700 rounded-2xl p-4 z-20 shadow-2xl"
          >
            <p className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-3">Select Focus Topic</p>
            <div className="flex flex-wrap gap-2">
              {topics.map(t => (
                <button
                  key={t}
                  onClick={() => { onTopicChange(t); setShowTopics(false); }}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${activeTopic === t ? 'bg-kindred-accent text-white' : 'bg-kindred-900 text-stone-400 hover:text-white'}`}
                >
                  {t}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 custom-scrollbar z-0 relative">
        <div className="flex justify-center mb-6">
            <span className="bg-kindred-800 text-stone-400 text-xs py-1 px-3 rounded-full border border-kindred-700 font-mono uppercase tracking-widest opacity-70 shadow-sm">
              Today
            </span>
        </div>

        {messages.map((msg) => {
          const isMe = msg.senderId === 'me';
          const isSystem = msg.type === 'system';

          if (isSystem) {
            return (
              <div key={msg.id} className="flex justify-center my-4">
                <div className="bg-kindred-800/50 text-stone-400 text-[11px] px-4 py-2 rounded-xl border border-kindred-700/30 italic">
                  {msg.text}
                </div>
              </div>
            );
          }

          return (
            <div 
              key={msg.id} 
              className={`flex ${isMe ? 'justify-end' : 'justify-start'} group`}
            >
              <div 
                className={`
                  max-w-[85%] md:max-w-[65%] rounded-2xl px-4 py-2 shadow-md relative
                  ${isMe 
                    ? 'bg-kindred-msgOut text-white rounded-tr-none' 
                    : 'bg-kindred-msgIn text-stone-200 border border-kindred-700 rounded-tl-none'
                  }
                `}
              >
                {/* Tail for bubble */}
                <div className={`absolute top-0 w-3 h-3 ${isMe ? '-right-2' : '-left-2'} overflow-hidden`}>
                   <div className={`w-4 h-4 transform rotate-45 origin-center mt-1 ${isMe ? 'bg-kindred-msgOut -translate-x-3' : 'bg-kindred-msgIn border-t border-l border-kindred-700 translate-x-3'}`}></div>
                </div>

                <p className="text-sm md:text-[15px] leading-relaxed whitespace-pre-wrap break-words relative z-10">
                  {msg.text}
                </p>
                
                <div className={`flex items-center justify-end gap-1 mt-1 ${isMe ? 'text-rose-100' : 'text-stone-500'}`}>
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
              <div className="bg-kindred-msgIn border border-kindred-700 rounded-2xl rounded-tl-none px-4 py-3 shadow-md flex items-center gap-1.5">
                  <div className="w-2 h-2 bg-kindred-accent rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-2 h-2 bg-kindred-accent rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-2 h-2 bg-kindred-accent rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
           </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Conversation Starters */}
      {contact.isAi && messages.length < 10 && (
        <div className="px-4 py-2 bg-kindred-900/50 border-t border-kindred-800 overflow-x-auto custom-scrollbar flex gap-2 no-scrollbar">
          {CONVERSATION_STARTERS[activeTopic].map((starter, i) => (
            <button
              key={i}
              onClick={() => onSendMessage(starter)}
              className="flex-shrink-0 bg-kindred-800 hover:bg-kindred-700 text-stone-300 text-xs px-4 py-2 rounded-full border border-kindred-700 transition-colors whitespace-nowrap"
            >
              {starter}
            </button>
          ))}
        </div>
      )}

      {/* Input Area */}
      <div className="z-10 relative">
        <MessageInput onSendMessage={onSendMessage} />
      </div>
    </div>
  );
};

export default ChatWindow;
