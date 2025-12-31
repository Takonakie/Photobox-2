import { GoogleGenAI } from "@google/genai";

export async function POST(req: Request) {
  try {
    // 1. CEK API KEY (Wajib ada di .env)
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("API Key tidak ditemukan di .env");
    }

    // 2. Inisialisasi sesuai Dokumentasi (Pass API Key Explicitly)
    const ai = new GoogleGenAI({ apiKey: apiKey });

    // 3. Ambil Data dari Frontend
    const { userImage, idolImage, userPrompt, backgroundPrompt } = await req.json();

    // 4. Bersihkan Base64 Header (Hapus 'data:image/jpeg;base64,')
    const cleanUser = userImage ? userImage.replace(/^data:image\/\w+;base64,/, "") : null;
    const cleanIdol = idolImage ? idolImage.replace(/^data:image\/\w+;base64,/, "") : null;

    if (!cleanUser) throw new Error("Foto User (Slide 1) wajib ada.");

    // 5. Susun Parts (Multimodal Input)
    let parts: any[] = [];
    let promptText = "";

    // Context Background
    const bgContext = backgroundPrompt 
      ? `The background/setting must be: ${backgroundPrompt}.` 
      : "The setting is a solid color aesthetic photobooth background.";

    if (cleanIdol) {
      // --- MODE DUO (Merge 2 Orang) ---
      promptText = `Create a single high-quality 4:3 rasio landscapeclose-up of two people posing together.
                    Person 1 is based on the first input image (User).
                    Person 2 is based on the second input image (Idol). 
                    Pose: ${userPrompt || "Cheek to cheek, smiling at camera, romantic vibe."}
                    Strict Requirements:
                    - Do NOT create a collage or grid. Create ONE single image.
                    - No borders, no frames, no text inside the image.
                    - Aspect ratio is 4:3(Landscape). DON'T MAKE IT IN PORTRAIT OR SQUARE RATIO. MAKE IT IN LANDSCAPE.
                    - Focus on preserving the facial identity of Person 1 and Person 2.
                    - Lighting: Soft studio lighting, flattering skin texture.
                    - Background: ${bgContext || "Plain pastel color or simple studio curtain."}
                    - Image quality: Ultra high resolution, sharp details. Make sure the photo is full without any elements being cut off, such as the head, shoulders, etc.
                    `;
      
      // Masukkan Teks + Foto 1 + Foto 2
      parts = [
        { text: promptText },
        { inlineData: { data: cleanUser, mimeType: "image/jpeg" } },
        { inlineData: { data: cleanIdol, mimeType: "image/jpeg" } }
      ];
    } else {
      // --- MODE SOLO (1 Orang) ---
      promptText = `
        Generate a single 4:3 rasio landscape photobooth-style of ONE person.
        Pose instruction: ${userPrompt || "Smiling brightly"}. 
        Strict Requirements:
        - Do NOT create a collage or grid. Create ONE single image.
        - No borders, no frames, no text inside the image.
        - Aspect ratio is 4:3(Landscape). DON'T MAKE IT IN PORTRAIT OR SQUARE RATIO. MAKE IT IN LANDSCAPE.
        - Focus on preserving the facial identity.
        - Lighting: Soft studio lighting, flattering skin texture.
        - Background: ${bgContext || "Plain pastel color or simple studio curtain."}
        - Image quality: Ultra high resolution, sharp details. Make sure the photo is full without any elements being cut off, such as the head, shoulders, etc.
      `;

      // Masukkan Teks + Foto 1 Saja
      parts = [
        { text: promptText },
        { inlineData: { data: cleanUser, mimeType: "image/jpeg" } }
      ];
    }

    console.log("🍌 Mengirim request ke Nano Banana...");

    // 6. Panggil API (Structure sesuai dokumentasi @google/genai)
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-image",
      contents: [
        {
          role: "user", // Optional tapi good practice
          parts: parts
        }
      ],
      config: {
        responseModalities: ["IMAGE"], // Memaksa output gambar
      }
    });

    // 7. Parsing Output (Cari inlineData)
    const candidates = response.candidates;
    if (candidates && candidates[0]?.content?.parts) {
      for (const part of candidates[0].content.parts) {
        if (part.inlineData) {
          // Sukses! Kembalikan base64 raw
          return Response.json({ output: part.inlineData.data });
        }
      }
    }

    throw new Error("Gemini tidak mengembalikan gambar (Mungkin kena safety filter).");

  } catch (error: any) {
    console.error("🔥 Error API:", error);
    return Response.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}