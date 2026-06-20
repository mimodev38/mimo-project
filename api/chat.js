export default async function handler(req, res) {
  // CORS biztonsági beállítások a böngészőhöz
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

    // Tisztítás: Kinyerjük a tiszta MimeType-ot és a nyers Base64 kódot (fejléc nélkül)
    const dataUrl = imagePart.image_url.url;
    const mimeType = dataUrl.substring(dataUrl.indexOf(":") + 1, dataUrl.indexOf(";"));
    const base64Data = dataUrl.substring(dataUrl.indexOf(",") + 1);
    const promptText = textPart?.text || "Extract information as JSON.";

    // Hívás a stabil Google Gemini 1.5 Flash végpont felé
    const response = await fetch(`https://googleapis.com{apiKey}`, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json" 
      },
      body: JSON.stringify({
        contents: [{
          parts: [
            { inlineData: { mimeType: mimeType, data: base64Data } },
            { text: promptText }
          ]
        }],
        generationConfig: { 
          responseMimeType: "application/json" 
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      return res.status(response.status).json({ error: `Gemini hálózati hiba: ${errorText}` });
    }

    const data = await response.json();
    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    
    return res.status(200).json({ reply: reply });
    
  } catch (err) {
    return res.status(500).json({ error: "Szerveroldali hiba: " + err.message });
  }
}
