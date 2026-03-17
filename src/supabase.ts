import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables. Please check your .env file.');
}

// Export a dummy client if keys are missing to avoid immediate crash, 
// though most operations will fail. The App component will handle the UI.
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co', 
  supabaseAnonKey || 'placeholder'
);

export const isSupabaseConfigured = !!(supabaseUrl && supabaseAnonKey);

export const BUCKETS = {
  AVATARS: 'avatars',
  CHAT_MEDIA: 'chat-media'
};
