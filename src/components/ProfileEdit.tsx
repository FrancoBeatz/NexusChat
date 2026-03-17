import React, { useState, useRef } from 'react';
import { UserProfile } from '../types';
import { ICONS } from '../constants';
import { motion } from 'motion/react';
import { supabase, BUCKETS } from '../supabase';

interface ProfileEditProps {
  profile: UserProfile;
  onSave: (profile: UserProfile) => void;
  onBack: () => void;
}

const ProfileEdit: React.FC<ProfileEditProps> = ({ profile, onSave, onBack }) => {
  const [name, setName] = useState(profile.name);
  const [bio, setBio] = useState(profile.bio);
  const [avatar, setAvatar] = useState(profile.avatar);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from(BUCKETS.AVATARS)
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from(BUCKETS.AVATARS)
        .getPublicUrl(filePath);

      setAvatar(publicUrl);
    } catch (error: any) {
      console.error('Error uploading avatar:', error.message);
      alert('Failed to upload image. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

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
              className={`w-32 h-32 rounded-full object-cover border-4 border-kindred-800 shadow-xl ${isUploading ? 'opacity-50' : ''}`}
            />
            <button 
              onClick={handleAvatarClick}
              disabled={isUploading}
              className="absolute bottom-0 right-0 p-2 bg-kindred-accent text-white rounded-full shadow-lg hover:bg-kindred-accentHover transition-colors disabled:opacity-50"
            >
              {isUploading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <ICONS.Camera className="w-5 h-5" />
              )}
            </button>
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileChange} 
              accept="image/*" 
              className="hidden" 
            />
          </div>
          <p className="mt-4 text-sm text-stone-400">Click the camera to upload a photo</p>
          <button 
            onClick={() => setAvatar(`https://picsum.photos/seed/${Math.random()}/200/200`)}
            className="mt-2 text-xs text-kindred-accent hover:underline"
          >
            Or use a random one
          </button>
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
