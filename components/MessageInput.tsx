import React, { useState, useRef, useEffect } from 'react';
import { ICONS } from '../constants';
import { Message } from '../types';
import { motion, AnimatePresence } from 'motion/react';

interface MessageInputProps {
  onSendMessage: (text: string, replyToId?: string) => void;
  onTyping: (isTyping: boolean) => void;
  replyingTo: Message | null;
  onCancelReply: () => void;
}

const MessageInput: React.FC<MessageInputProps> = ({ onSendMessage, onTyping, replyingTo, onCancelReply }) => {
  const [text, setText] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [showAudioConfirm, setShowAudioConfirm] = useState(false);
  const [lastTranscript, setLastTranscript] = useState('');
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<any>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const emojis = ['😊', '😂', '❤️', '👍', '🙏', '🔥', '✨', '🥺', '🙌', '😎', '🤔', '😢'];

  const addEmoji = (emoji: string) => {
    setText(prev => prev + emoji);
    setShowEmojiPicker(false);
    if (textareaRef.current) textareaRef.current.focus();
  };

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event: any) => {
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          }
        }
        if (finalTranscript) {
          setLastTranscript(prev => prev + (prev ? ' ' : '') + finalTranscript);
        }
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        stopListening();
      };

      recognitionRef.current.onend = () => {
        if (isListening) stopListening();
      };
    }

    return () => {
      if (recognitionRef.current) recognitionRef.current.stop();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isListening]);

  const startListening = () => {
    if (!recognitionRef.current) {
      alert('Speech recognition is not supported in your browser.');
      return;
    }
    setLastTranscript('');
    setRecordingTime(0);
    setShowAudioConfirm(false);
    setIsListening(true);
    recognitionRef.current.start();
    
    timerRef.current = setInterval(() => {
      setRecordingTime(prev => prev + 1);
    }, 1000);
  };

  const stopListening = () => {
    if (recognitionRef.current) recognitionRef.current.stop();
    if (timerRef.current) clearInterval(timerRef.current);
    setIsListening(false);
    setShowAudioConfirm(true);
  };

  const handleConfirmAudio = () => {
    if (lastTranscript.trim()) {
      setText(prev => prev + (prev ? ' ' : '') + lastTranscript);
    }
    setShowAudioConfirm(false);
    setLastTranscript('');
  };

  const handleCancelAudio = () => {
    setShowAudioConfirm(false);
    setLastTranscript('');
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSend = () => {
    if (text.trim()) {
      onSendMessage(text, replyingTo?.id);
      setText('');
      onCancelReply();
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
    e.target.style.height = 'auto';
    e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;

    onTyping(true);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      onTyping(false);
    }, 2000);
  };

  return (
    <div className="bg-kindred-800 border-t border-kindred-700 flex flex-col">
      <AnimatePresence>
        {replyingTo && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="px-4 py-2 bg-kindred-900/50 border-b border-kindred-700 flex items-center justify-between"
          >
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-1 h-8 bg-kindred-accent rounded-full" />
              <div className="flex flex-col min-w-0">
                <span className="text-[10px] font-bold text-kindred-accent uppercase tracking-wider">Replying to</span>
                <p className="text-xs text-stone-400 truncate">{replyingTo.text}</p>
              </div>
            </div>
            <button onClick={onCancelReply} className="p-1 text-stone-500 hover:text-white transition-colors">
              <ICONS.X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="p-3 flex items-end gap-2 relative">
        <AnimatePresence>
          {isListening && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="absolute inset-0 z-20 bg-kindred-800 flex items-center px-4 gap-4"
            >
              <div className="flex items-center gap-2 text-red-500">
                <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                <span className="font-mono text-sm">{formatDuration(recordingTime)}</span>
              </div>
              <div className="flex-1 flex items-center gap-1">
                {[...Array(20)].map((_, i) => (
                  <motion.div 
                    key={i}
                    animate={{ height: [4, Math.random() * 24 + 4, 4] }}
                    transition={{ repeat: Infinity, duration: 0.5, delay: i * 0.05 }}
                    className="w-1 bg-red-500/50 rounded-full"
                  />
                ))}
              </div>
              <button 
                onClick={stopListening}
                className="bg-red-500 text-white p-2 rounded-full shadow-lg shadow-red-500/20"
              >
                <ICONS.Check className="w-5 h-5" />
              </button>
            </motion.div>
          )}

          {showAudioConfirm && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="absolute inset-0 z-20 bg-kindred-800 flex items-center px-4 gap-3"
            >
              <div className="flex-1 bg-kindred-900 rounded-lg px-4 py-2 border border-kindred-700">
                <p className="text-xs text-stone-400 italic truncate">
                  {lastTranscript || "No speech detected..."}
                </p>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={handleCancelAudio}
                  className="p-2 text-stone-400 hover:text-white transition-colors"
                >
                  <ICONS.X className="w-5 h-5" />
                </button>
                <button 
                  onClick={handleConfirmAudio}
                  className="bg-kindred-accent text-kindred-900 p-2 rounded-full shadow-lg shadow-kindred-accent/20"
                >
                  <ICONS.Check className="w-5 h-5" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="relative">
          <button 
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className={`p-2 transition-colors rounded-full hover:bg-kindred-700 ${showEmojiPicker ? 'text-kindred-accent' : 'text-stone-400'}`}
          >
            <ICONS.Smile className="w-6 h-6" />
          </button>
          
          <AnimatePresence>
            {showEmojiPicker && (
              <motion.div 
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                className="absolute bottom-full left-0 mb-2 p-2 bg-kindred-800 border border-kindred-700 rounded-xl shadow-2xl z-30 grid grid-cols-4 gap-1"
              >
                {emojis.map(emoji => (
                  <button 
                    key={emoji}
                    onClick={() => addEmoji(emoji)}
                    className="p-2 hover:bg-kindred-700 rounded-lg transition-colors text-xl"
                  >
                    {emoji}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
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

        {text.trim() ? (
          <button 
            onClick={handleSend}
            className="p-3 rounded-full bg-kindred-accent text-kindred-900 shadow-lg shadow-kindred-accent/20 hover:bg-kindred-accentHover transition-all transform active:scale-95"
          >
            <ICONS.Send className="w-5 h-5" />
          </button>
        ) : (
          <button 
            onClick={startListening}
            className="p-3 text-stone-400 hover:text-kindred-accent transition-colors rounded-full hover:bg-kindred-700"
          >
             <ICONS.Mic className="w-6 h-6" />
          </button>
        )}
      </div>
    </div>
  );
};

export default MessageInput;
