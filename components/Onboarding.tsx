import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ICONS } from '../constants';

interface OnboardingProps {
  onComplete: () => void;
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

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
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
