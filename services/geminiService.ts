import { GoogleGenAI, Type } from "@google/genai";
import { StudyDefinition } from "../types";

/**
 * Performs OCR on a radiology worklist image and matches procedures to the reference database.
 * Strictly adheres to the @google/genai SDK guidelines for browser-based execution.
 */
export const performOCRAndMatch = async (base64Image: string, currentDb: StudyDefinition[]) => {
  // Always use process.env.API_KEY and the named parameter initialization.
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const referenceContext = currentDb.map(s => `NAME: ${s.name} | CPT: ${s.cpt}`).join('\n');

  try {
    // Extract the raw base64 data
    const base64Data = base64Image.includes(',') ? base64Image.split(',')[1] : base64Image;

    // Use the latest generateContent pattern with the recommended model.
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
              2. Match each extracted entry to the closest item in the REFERENCE LIST.
              3. Return each procedure individually; if a study appears multiple times, return multiple entries with quantity 1.
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
                  quantity: { type: Type.NUMBER, description: "Quantity for this individual line item." },
                  originalText: { type: Type.STRING, description: "Raw text found in the image." },
                  confidence: { type: Type.NUMBER, description: "Match confidence 0-1." }
                },
                required: ["cpt", "name", "quantity", "originalText", "confidence"]
              }
            }
          }
        }
      }
    });

    // Access the generated text via the .text property (not a method call).
    const jsonStr = response.text; 
    if (!jsonStr) {
      console.warn("Empty response from AI");
      return [];
    }

    const data = JSON.parse(jsonStr);
    return data.studies || [];
  } catch (error) {
    console.error("Radiology OCR/Matching Error:", error);
    return [];
  }
};