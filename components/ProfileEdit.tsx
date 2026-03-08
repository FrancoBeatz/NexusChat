import React, { useState } from 'react';
import { UserProfile } from '../types';
import { ICONS } from '../constants';
import { motion } from 'motion/react';

interface ProfileEditProps {
  profile: UserProfile;
  onSave: (profile: UserProfile) => void;
  onBack: () => void;
}

const ProfileEdit: React.FC<ProfileEditProps> = ({ profile, onSave, onBack }) => {
  const [name, setName] = useState(profile.name);
  const [bio, setBio] = useState(profile.bio);
  const [avatar, setAvatar] = useState(profile.avatar);

  const handleSave = () => {
    onSave({ name, bio, avatar });
  };

  return (
    <motion.div 
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className="absolute inset-0 bg-kindred-900 z-50 flex flex-col"
    >
      {/* Header */}
      <div className="p-4 bg-kindred-800 border-b border-kindred-700 flex items-center gap-4">
        <button onClick={onBack} className="p-2 text-stone-400 hover:text-white transition-colors">
          <ICONS.ArrowLeft className="w-6 h-6" />
        </button>
        <h2 className="text-xl font-semibold text-white">Profile</h2>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-8">
        {/* Avatar Section */}
        <div className="flex flex-col items-center">
          <div className="relative group">
            <img 
              src={avatar} 
              alt="Avatar" 
              className="w-32 h-32 rounded-full object-cover border-4 border-kindred-800 shadow-xl"
            />
            <button 
              onClick={() => {
                const newAvatar = prompt('Enter new avatar URL:', avatar);
                if (newAvatar) setAvatar(newAvatar);
              }}
              className="absolute bottom-0 right-0 p-2 bg-kindred-accent text-white rounded-full shadow-lg hover:bg-kindred-accentHover transition-colors"
            >
              <ICONS.Camera className="w-5 h-5" />
            </button>
          </div>
          <p className="mt-4 text-sm text-stone-400">Click the camera to change your photo</p>
        </div>

        {/* Form Section */}
        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-stone-500 ml-1">Your Name</label>
            <div className="relative">
              <ICONS.User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-500" />
              <input 
                type="text" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-kindred-800 text-white rounded-xl pl-12 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-kindred-accent transition-all border border-kindred-700"
                placeholder="Enter your name"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-stone-500 ml-1">About You</label>
            <textarea 
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={4}
              className="w-full bg-kindred-800 text-white rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-kindred-accent transition-all border border-kindred-700 resize-none"
              placeholder="Tell us something about yourself..."
            />
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="p-6 border-t border-kindred-700 bg-kindred-800/50">
        <button 
          onClick={handleSave}
          className="w-full bg-kindred-accent text-white font-bold py-4 rounded-xl hover:bg-kindred-accentHover transition-all transform active:scale-95 shadow-lg shadow-kindred-accent/20"
        >
          Save Changes
        </button>
      </div>
    </motion.div>
  );
};

export default ProfileEdit;
