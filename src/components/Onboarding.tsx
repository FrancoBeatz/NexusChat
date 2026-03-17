import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ICONS } from '../constants';

import { Contact, ChatSession, Message, AppView, UserProfile, RelationshipTopic } from '../types';

interface OnboardingProps {
  onComplete: (profile: UserProfile) => void;
}

const steps = [
  {
    title: "Welcome to Kindred",
    description: "A warm and friendly space for deep conversations and relationship growth.",
    icon: <ICONS.Heart className="w-16 h-16 text-kindred-accent" />,
    color: "bg-kindred-900"
  },
  {
    title: "Meet Kindred Spirit",
    description: "Your empathetic AI companion, here to listen, support, and guide you with wisdom.",
    icon: <div className="w-20 h-20 rounded-full bg-kindred-accent/20 flex items-center justify-center"><ICONS.Heart className="w-10 h-10 text-kindred-accent fill-current" /></div>,
    color: "bg-kindred-800"
  },
  {
    title: "Deep Conversations",
    description: "Explore topics like Dating, Friendship, and Self-care with guided sessions and starters.",
    icon: <ICONS.MessageSquare className="w-16 h-16 text-kindred-accent" />,
    color: "bg-kindred-900"
  }
];

const Onboarding: React.FC<OnboardingProps> = ({ onComplete }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState(`https://picsum.photos/seed/${Math.random()}/200/200`);
  const [error, setError] = useState<string | null>(null);

  const nextStep = () => {
    setError(null);
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      if (!name.trim()) {
        setError("Please enter your name to continue");
        return;
      }
      onComplete({
        name: name.trim(),
        avatar,
        bio: 'A safe space for my heart.'
      });
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: -20 }}
          className={`w-full max-w-md ${steps[currentStep].color} rounded-3xl p-8 shadow-2xl border border-kindred-700/50 flex flex-col items-center text-center`}
        >
          <div className="mb-8">
            {steps[currentStep].icon}
          </div>
          
          <h2 className="text-3xl font-bold text-white mb-4 tracking-tight">
            {steps[currentStep].title}
          </h2>
          
          <p className="text-stone-300 text-lg leading-relaxed mb-10">
            {steps[currentStep].description}
          </p>

          {currentStep === steps.length - 1 && (
            <div className="w-full mb-8 space-y-4">
              {error && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-red-500/20 border border-red-500/50 text-red-200 text-xs py-2 px-4 rounded-lg mb-4"
                >
                  {error}
                </motion.div>
              )}
              <div className="flex flex-col items-start gap-2">
                <label className="text-xs font-bold uppercase tracking-wider text-stone-500">Your Name</label>
                <input 
                  type="text" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="How should we call you?"
                  className="w-full bg-kindred-800 border border-kindred-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-kindred-accent"
                />
              </div>
              <div className="flex flex-col items-start gap-2">
                <label className="text-xs font-bold uppercase tracking-wider text-stone-500">Profile Picture</label>
                <div className="flex items-center gap-4 w-full">
                  <img src={avatar} alt="Avatar" className="w-12 h-12 rounded-full object-cover border-2 border-kindred-accent" />
                  <button 
                    onClick={() => setAvatar(`https://picsum.photos/seed/${Math.random()}/200/200`)}
                    className="text-xs text-kindred-accent font-bold hover:underline"
                  >
                    Shuffle Avatar
                  </button>
                </div>
              </div>
            </div>
          )}
          
          <div className="flex gap-2 mb-8">
            {steps.map((_, i) => (
              <div 
                key={i} 
                className={`h-1.5 rounded-full transition-all duration-300 ${i === currentStep ? 'w-8 bg-kindred-accent' : 'w-2 bg-stone-700'}`} 
              />
            ))}
          </div>
          
          <button 
            onClick={nextStep}
            className="w-full bg-kindred-accent text-white font-bold py-4 rounded-xl hover:bg-kindred-accentHover transition-all transform active:scale-95 shadow-lg shadow-kindred-accent/20"
          >
            {currentStep === steps.length - 1 ? "Let's Begin" : "Next"}
          </button>
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default Onboarding;
