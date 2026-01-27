import { GoogleGenAI, Type } from "@google/genai";
import { StudyDefinition } from "../types";

export const performOCRAndMatch = async (base64Image: string, currentDb: StudyDefinition[]) => {
  // Always use the required initialization pattern
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const referenceContext = currentDb.map(s => `NAME: ${s.name} | CPT: ${s.cpt}`).join('\n');

  try {
    // Clean the base64 string
    const base64Data = base64Image.includes(',') ? base64Image.split(',')[1] : base64Image;

    // Use ai.models.generateContent with a valid model name from the guidelines
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
              Extract every radiology procedure from the image. Match to the REFERENCE LIST. 
              Do not aggregate entries; return each one individually found.
              Return JSON only with a "studies" array.` 
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
                  quantity: { type: Type.NUMBER },
                  originalText: { type: Type.STRING },
                  confidence: { type: Type.NUMBER }
                },
                required: ["cpt", "name", "quantity", "originalText", "confidence"]
              }
            }
          }
        }
      }
    });

    // Access text directly as a property, not a method
    const text = response.text; 
    if (!text) return [];

    const data = JSON.parse(text);
    return data.studies || [];
  } catch (error) {
    console.error("OCR Error details:", error);
    return [];
  }
};