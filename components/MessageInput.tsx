import React, { useState, useRef, useEffect } from 'react';
import { ICONS } from '../constants';

interface MessageInputProps {
  onSendMessage: (text: string) => void;
}

const MessageInput: React.FC<MessageInputProps> = ({ onSendMessage }) => {
  const [text, setText] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = () => {
    if (text.trim()) {
      onSendMessage(text);
      setText('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    // Auto-resize
    e.target.style.height = 'auto';
    e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
  };

  return (
    <div className="p-3 bg-nexus-800 border-t border-nexus-700 flex items-end gap-2">
      <button className="p-2 text-slate-400 hover:text-nexus-accent transition-colors rounded-full hover:bg-nexus-700">
        <ICONS.Smile className="w-6 h-6" />
      </button>
      <button className="p-2 text-slate-400 hover:text-nexus-accent transition-colors rounded-full hover:bg-nexus-700">
        <ICONS.Paperclip className="w-6 h-6" />
      </button>
      
      <div className="flex-1 bg-nexus-900 rounded-lg border border-nexus-700 focus-within:border-nexus-accent transition-colors">
        <textarea
          ref={textareaRef}
          value={text}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          rows={1}
          className="w-full bg-transparent text-slate-200 px-4 py-3 max-h-[120px] focus:outline-none resize-none overflow-y-auto custom-scrollbar"
        />
      </div>

      {text.trim() ? (
        <button 
          onClick={handleSend}
          className="p-3 bg-nexus-accent text-nexus-900 rounded-full hover:bg-nexus-accentHover transition-transform transform active:scale-95 shadow-lg shadow-nexus-accent/20"
        >
          <ICONS.Send className="w-5 h-5" />
        </button>
      ) : (
        <button className="p-3 text-slate-400 hover:text-nexus-accent transition-colors rounded-full hover:bg-nexus-700">
           <ICONS.Mic className="w-6 h-6" />
        </button>
      )}
    </div>
  );
};

export default MessageInput;