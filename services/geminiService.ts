import { StudyDefinition } from "../types";

/**
 * Sends the image to our SECURE Netlify Function.
 * The "Brain" and the API Key now live safely on the server.
 */
export const performOCRAndMatch = async (base64Image: string, currentDb: StudyDefinition[]) => {
  try {
    // Extract raw base64 data
    const base64Data = base64Image.includes(',') ? base64Image.split(',')[1] : base64Image;

    // We call OUR server path, which hides the API key from the browser
    const response = await fetch("/.netlify/functions/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        base64Image: base64Data, 
        currentDb // Sending the reference list to the function
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "OCR Analysis failed");
    }

    const data = await response.json();
    return data.studies || [];
  } catch (error: any) {
    console.error("Frontend OCR Error:", error);
    return [];
  }
};