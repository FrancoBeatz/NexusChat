import { GoogleGenAI, Chat } from "@google/genai";
import { SYSTEM_PROMPT } from '../constants';

let aiInstance: GoogleGenAI | null = null;
let chatSession: Chat | null = null;

const getAiInstance = () => {
  if (!aiInstance && process.env.GEMINI_API_KEY) {
    aiInstance = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  return aiInstance;
};

export const initializeChat = async () => {
  const ai = getAiInstance();
  if (!ai) return null;

  try {
    chatSession = ai.chats.create({
      model: 'gemini-3-flash-preview',
      config: {
        systemInstruction: SYSTEM_PROMPT,
        temperature: 0.7,
      },
    });
    return chatSession;
  } catch (error) {
    console.error("Failed to initialize Gemini chat:", error);
    return null;
  }
};

export const sendMessageToGemini = async (message: string): Promise<string> => {
  if (!chatSession) {
    await initializeChat();
  }

  if (!chatSession) {
    return "I'm having a little trouble connecting right now. Can we try again in a moment?";
  }

  try {
    const response = await chatSession.sendMessage({ message });
    return response.text || "I'm listening, but I didn't quite catch that. Could you say it again?";
  } catch (error) {
    console.error("Gemini API Error:", error);
    // Reset session on error in case of expiry
    chatSession = null;
    return "I lost my train of thought for a second. Let's try that again?";
  }
};