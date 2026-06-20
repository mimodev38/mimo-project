import { GoogleGenAI } from '@google/generative-ai';

export default async function handler(req, res) {
  // CORS biztonsági fejlécek a böngészőhöz
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Only POST allowed" });
  }

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "Hiányzó GEMINI_API_KEY beállítás a Vercel-en!" });
    }

    // Inicializáljuk a hivatalos Google Generative AI klienst
    const ai = new GoogleGenAI({ apiKey: apiKey });

    const { messages } = req.body;
    const userContent = messages?.[0]?.content;
    
    if (!userContent || !Array.isArray(userContent)) {
      return res.status(400).json({ error: "Hibás vagy hiányzó kérés formátum!" });
    }

    const imagePart = userContent.find(c => c.type === 'image_url');
    const textPart = userContent.find(c => c.type === 'text');

    if (!imagePart || !imagePart.image_url?.url) {
      return res.status(400).json({ error: "Nem található kép a kérésben!" });
    }

    // Képadatok kicsomagolása a Google formátumához
    const dataUrl = imagePart.image_url.url;
    const mimeType = dataUrl.substring(dataUrl.indexOf(":") + 1, dataUrl.indexOf(";"));
    const base64Data = dataUrl.substring(dataUrl.indexOf(",") + 1);
    const promptText = textPart?.text || "Extract information as JSON.";

    const model = ai.getGenerativeModel({ 
      model: "gemini-1.5-flash",
      generationConfig: { responseMimeType: "application/json" }
    });

    // Hivatalos, biztonságos API hívás a Google felé
    const result = await model.generateContent([
      promptText,
      {
        inlineData: {
          data: base64Data,
          mimeType: mimeType
        }
      }
    ]);

    const response = await result.response;
    const reply = response.text();

    return res.status(200).json({ reply: reply });
    
  } catch (err) {
    return res.status(500).json({ error: "Szerveroldali Google hiba: " + err.message });
  }
}
