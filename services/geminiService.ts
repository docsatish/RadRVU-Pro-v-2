import { GoogleGenAI, Type } from "@google/genai";
import { StudyDefinition } from "../types";

export const performOCRAndMatch = async (base64Image: string, currentDb: StudyDefinition[]) => {
  // Always use the required initialization pattern with named parameter
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const referenceContext = currentDb.map(s => `NAME: ${s.name} | CPT: ${s.cpt}`).join('\n');

  try {
    // Clean the base64 string
    const base64Data = base64Image.includes(',') ? base64Image.split(',')[1] : base64Image;

    // Use ai.models.generateContent with the recommended model and schema
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [
        {
          parts: [
            {
              text: `You are an expert Radiology Medical Coder.
              
              REFERENCE LIST:
              ${referenceContext}
              
              INSTRUCTIONS:
              1. Extract every individual radiology procedure from the provided image.
              2. Match each extracted entry to the closest item in the REFERENCE LIST based on name and context.
              3. DO NOT aggregate entries in this step; if a study appears multiple times, return multiple entries with quantity 1.
              4. Return the result strictly as a JSON object with a "studies" array.` 
            },
            {
              inlineData: {
                mimeType: "image/jpeg",
                data: base64Data
              }
            }
          ]
        }
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            studies: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  cpt: { type: Type.STRING },
                  name: { type: Type.STRING },
                  quantity: { type: Type.NUMBER, description: "Set to 1 for each distinct entry found." },
                  originalText: { type: Type.STRING, description: "The raw text as seen on the image." },
                  confidence: { type: Type.NUMBER, description: "Score from 0 to 1 indicating match quality." }
                },
                required: ["cpt", "name", "quantity", "originalText", "confidence"]
              }
            }
          }
        }
      }
    });

    // Access text directly as a property per SDK requirements
    const jsonStr = response.text; 
    if (!jsonStr) return [];

    const data = JSON.parse(jsonStr);
    return data.studies || [];
  } catch (error) {
    console.error("OCR/Matching Error:", error);
    return [];
  }
};