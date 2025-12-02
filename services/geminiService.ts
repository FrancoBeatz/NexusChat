import { GoogleGenAI, Chat } from "@google/genai";
import { SYSTEM_PROMPT } from '../constants';

let aiInstance: GoogleGenAI | null = null;
let chatSession: Chat | null = null;

const getAiInstance = () => {
  if (!aiInstance && process.env.API_KEY) {
    aiInstance = new GoogleGenAI({ apiKey: process.env.API_KEY });
  }
  return aiInstance;
};

export const initializeChat = async () => {
  const ai = getAiInstance();
  if (!ai) return null;

  try {
    chatSession = ai.chats.create({
      model: 'gemini-2.5-flash',
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
    return "Error: Unable to connect to Nexus AI network.";
  }

  try {
    const response = await chatSession.sendMessage({ message });
    return response.text || "No response received.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    // Reset session on error in case of expiry
    chatSession = null;
    return "Connection interrupted. Retrying uplink...";
  }
};