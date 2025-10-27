import { GoogleGenAI, GenerateContentResponse, Chat } from "@google/genai";
import type { UploadFile, GroundingChunk, ChatMessage } from '../types';

interface ReviewOutput {
  report: string;
  sources: GroundingChunk[];
}

export async function generateReview(
  prompt: string,
  files: UploadFile[],
  apiKey: string
): Promise<ReviewOutput> {
  // IMPORTANT: A new instance is created for each call to use the specific API key.
  const ai = new GoogleGenAI({ apiKey });

  const fileParts = files.map(file => ({
    inlineData: {
      mimeType: file.type,
      data: file.base64,
    },
  }));

  const textPart = { text: prompt };

  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: 'gemini-2.5-pro',
      contents: { parts: [textPart, ...fileParts] },
      config: {
        tools: [{ googleSearch: {} }],
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
        const parts = [{ text: msg.text }];
        // Note: The Gemini API history doesn't directly support files in the same way as a new message.
        // We rely on the context of the text. Files are sent with the current user prompt.
        return {
            role: msg.role,
            parts: parts
        };
    });
    
    const chat: Chat = ai.chats.create({
        model: 'gemini-2.5-pro',
        history: geminiHistory,
    });

    const fileParts = newMessage.files?.map(file => ({
        inlineData: { mimeType: file.type, data: file.base64 },
    })) || [];
    
    const textPart = { text: newMessage.text };
    
    try {
        const response = await chat.sendMessage({ parts: [textPart, ...fileParts] });
        return response.text;
    } catch (error) {
        console.error("Gemini chat call failed:", error);
        if (error instanceof Error) {
            throw new Error(`Gemini API Error: ${error.message}`);
        }
        throw new Error("An unknown error occurred while contacting the Gemini API.");
    }
}
