
import { GoogleGenAI, GenerateContentResponse, Chat } from "@google/genai";
import type { UploadFile, GroundingChunk, ChatMessage } from '../types';

interface ReviewOutput {
  report: string;
  sources: GroundingChunk[];
}

// Helper to fetch a file from a URL and convert it to a base64 string
async function urlToBase64(url: string): Promise<string> {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Failed to fetch file from URL: ${url}`);
    }
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(blob);
        reader.onload = () => {
            const result = reader.result as string;
            resolve(result.split(',')[1]); // remove the "data:mime/type;base64," part
        };
        reader.onerror = error => reject(error);
    });
}

export async function generateReview(
  prompt: string,
  files: UploadFile[],
  apiKey: string
): Promise<ReviewOutput> {
  const ai = new GoogleGenAI({ apiKey });

  // Fetch files from URLs and convert to base64 for the API call
  const fileParts = await Promise.all(files.map(async (file) => {
    const base64Data = await urlToBase64(file.url);
    return {
      inlineData: {
        mimeType: file.type,
        data: base64Data,
      },
    };
  }));

  const textPart = { text: prompt };

  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: 'gemini-2.5-pro',
      contents: { parts: [textPart, ...fileParts] },
      config: {
        tools: [{ googleSearch: {} }],
        thinkingConfig: { thinkingBudget: 32768 }, // Max budget for deep analysis
      },
    });

    const report = response.text;
    const groundingMetadata = response.candidates?.[0]?.groundingMetadata;
    const sources = groundingMetadata?.groundingChunks || [];
    
    return { report, sources: sources as GroundingChunk[] };

  } catch (error) {
    console.error("Gemini API call failed:", error);
    if (error instanceof Error) {
        throw new Error(`Gemini API Error: ${error.message}`);
    }
    throw new Error("An unknown error occurred while contacting the Gemini API.");
  }
}

export async function continueChat(
  apiKey: string,
  history: ChatMessage[],
  newMessage: ChatMessage
): Promise<string> {
    const ai = new GoogleGenAI({ apiKey });

    const geminiHistory = history.map(msg => {
        return {
            role: msg.role,
            parts: [{ text: msg.text }]
        };
    });
    
    const chat: Chat = ai.chats.create({
        model: 'gemini-2.5-pro',
        history: geminiHistory,
    });

    const fileParts = newMessage.files ? await Promise.all(newMessage.files.map(async (file) => {
      const base64Data = await urlToBase64(file.url);
      return {
        inlineData: { mimeType: file.type, data: base64Data },
      };
    })) : [];
    
    const textPart = { text: newMessage.text };
    
    try {
        const response = await chat.sendMessage({ message: [textPart, ...fileParts] });
        return response.text;
    } catch (error) {
        console.error("Gemini chat call failed:", error);
        if (error instanceof Error) {
            throw new Error(`Gemini API Error: ${error.message}`);
        }
        throw new Error("An unknown error occurred while contacting the Gemini API.");
    }
}