// backend/showerDetector.js
import { GoogleGenAI } from "@google/genai";
import fs from "fs";
import path from "path";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

/**
 * Detects if a user is actively showering based on audio analysis
 * @param {string} filePath - Path to the audio file to analyze
 * @returns {Promise<boolean>} - true if showering detected, false otherwise
 */
export async function isShowering(filePath) {
  try {
    if (!process.env.GEMINI_API_KEY) throw new Error("GEMINI_API_KEY not set");
    if (!fs.existsSync(filePath)) throw new Error(`File not found: ${filePath}`);

    const fileBuffer = fs.readFileSync(filePath);
    const base64Audio = fileBuffer.toString("base64");
    
    const ext = path.extname(filePath).toLowerCase();
    const mimeType = {
      ".mp3": "audio/mpeg",
      ".wav": "audio/wav",
      ".m4a": "audio/mp4",
      ".ogg": "audio/ogg"
    }[ext] || "audio/mpeg";

    const systemPrompt = `You are a shower detection AI. Listen to this audio clip from a bathroom.

Analyze the audio to determine if someone is actively taking a shower. Look for:
- Running water (shower/faucet sounds)
- Water hitting a person or surface (splashing sounds)
- Human presence (movement, muffled sounds indicating someone is in the shower)

Return ONLY a JSON object with a single boolean field:
{
  "isShowering": boolean
}

Return true ONLY if you clearly detect both running water AND evidence of someone actively showering. Return false if:
- No water sounds detected
- Water is running but no human activity is present
- Sounds are unclear or ambiguous`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        { text: systemPrompt },
        { 
          inlineData: { 
            mimeType: mimeType, 
            data: base64Audio 
          } 
        }
      ],
      config: {
        responseMimeType: "application/json",
      }
    });

    const text = response.text; 
    const data = JSON.parse(text);

    return Boolean(data.isShowering);

  } catch (error) {
    console.error("❌ Shower Detection Error:", error.message);
    // Fail-safe: return false on error (fail closed - don't approve if we can't verify)
    return false;
  }
}

