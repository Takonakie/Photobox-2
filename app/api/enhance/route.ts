import { GoogleGenAI } from "@google/genai";

export async function POST(req: Request) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("API Key missing");
    
    const ai = new GoogleGenAI({ apiKey });
    const { prompt } = await req.json();

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash", // Model teks cepat
      contents: `Rewrite this image prompt to be more descriptive, artistic, and detailed 
      for an AI generator. Keep it under 40 words. Avoid to give option, choose the best one. 
      Give your enhance output based on user's language question(If user ask in English, give enhance 
      in English, if user ask in Indonesia, give enhance in Indonesia). Avoid to add your enhance 
      output with some format like bold, italic, all caps, asterisk, and other. Original: "${prompt}"`,
    });

    const enhancedText = response.candidates?.[0]?.content?.parts?.[0]?.text;
    return Response.json({ output: enhancedText || prompt });
  } catch (error) {
    return Response.json({ output: "Error enhancing prompt" });
  }
}