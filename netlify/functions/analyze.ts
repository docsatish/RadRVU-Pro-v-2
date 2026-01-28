import { GoogleGenerativeAI } from "@google/generative-ai";

export const handler = async (event: any) => {
  if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };

  try {
    const { base64Image, currentDb } = JSON.parse(event.body);
    const genAI = new GoogleGenerativeAI(process.env.API_KEY!);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    // This creates the list of your CPT codes for Gemini to match against
    const referenceContext = currentDb.map((s: any) => `NAME: ${s.name} | CPT: ${s.cpt}`).join('\n');

    const prompt = `You are a Radiology Coding expert. Match procedures in the image to this list:\n${referenceContext}\nReturn strictly as JSON with a "studies" array.`;

    const result = await model.generateContent([
      { inlineData: { mimeType: "image/jpeg", data: base64Image } },
      { text: prompt }
    ]);

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: result.response.text(),
    };
  } catch (error: any) {
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
};