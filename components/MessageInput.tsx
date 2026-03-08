import React, { useState, useRef, useEffect } from 'react';
import { ICONS } from '../constants';

interface MessageInputProps {
  onSendMessage: (text: string) => void;
}

const MessageInput: React.FC<MessageInputProps> = ({ onSendMessage }) => {
  const [text, setText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    // Initialize Speech Recognition
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event: any) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }

        if (finalTranscript) {
          setText(prev => prev + (prev ? ' ' : '') + finalTranscript);
        }
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  const toggleListening = () => {
    if (!recognitionRef.current) {
      alert('Speech recognition is not supported in your browser.');
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
    } else {
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

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
    <div className="p-3 bg-kindred-800 border-t border-kindred-700 flex items-end gap-2">
      <button className="p-2 text-stone-400 hover:text-kindred-accent transition-colors rounded-full hover:bg-kindred-700">
        <ICONS.Smile className="w-6 h-6" />
      </button>
      <button className="p-2 text-stone-400 hover:text-kindred-accent transition-colors rounded-full hover:bg-kindred-700">
        <ICONS.Paperclip className="w-6 h-6" />
      </button>
      
      <div className="flex-1 bg-kindred-900 rounded-lg border border-kindred-700 focus-within:border-kindred-accent transition-colors">
        <textarea
          ref={textareaRef}
          value={text}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder="Write something..."
          rows={1}
          className="w-full bg-transparent text-stone-200 px-4 py-3 max-h-[120px] focus:outline-none resize-none overflow-y-auto custom-scrollbar"
        />
      </div>

      {text.trim() || isListening ? (
        <button 
          onClick={text.trim() ? handleSend : toggleListening}
          className={`p-3 rounded-full transition-all transform active:scale-95 shadow-lg ${
            isListening 
              ? 'bg-red-500 text-white animate-pulse shadow-red-500/20' 
              : 'bg-kindred-accent text-kindred-900 shadow-kindred-accent/20 hover:bg-kindred-accentHover'
          }`}
        >
          {text.trim() ? <ICONS.Send className="w-5 h-5" /> : <ICONS.MicOff className="w-5 h-5" />}
        </button>
      ) : (
        <button 
          onClick={toggleListening}
          className="p-3 text-stone-400 hover:text-kindred-accent transition-colors rounded-full hover:bg-kindred-700"
        >
           <ICONS.Mic className="w-6 h-6" />
        </button>
      )}
    </div>
  );
};

export default MessageInput;