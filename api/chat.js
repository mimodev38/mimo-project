export default async function handler(req, res) {
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
    // Beolvassuk a Vercel-be elmentett ingyenes kulcsodat
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "Hiányzó GEMINI_API_KEY beállítás a Vercel-en!" });
    }

    const { messages } = req.body;
    
    // Kivesszük a frontendről érkező adatokat (képet és a prompt szöveget)
    const userContent = messages?.[0]?.content;
    if (!userContent || !Array.isArray(userContent)) {
      return res.status(400).json({ error: "Hibás kérés formátum!" });
    }

    const imagePart = userContent.find(c => c.type === 'image_url');
    const textPart = userContent.find(c => c.type === 'text');

    if (!imagePart || !imagePart.image_url?.url) {
      return res.status(400).json({ error: "Nem található kép a kérésben!" });
    }

    // Szétvágjuk a Base64-es szöveget, mert a Gemininek külön kell a típus és a nyers adat
    const rawData = imagePart.image_url.url;
    const commaIndex = rawData.indexOf(',');
    if (commaIndex === -1) {
      return res.status(400).json({ error: "Sérült képadat formátum!" });
    }

    const mimeType = rawData.substring(rawData.indexOf(':') + 1, rawData.indexOf(';'));
    const base64Data = rawData.substring(commaIndex + 1);
    const promptText = textPart?.text || "Elemezd a képet.";

    // Hívás az ingyenes Google Gemini 1.5 Flash API felé
    const response = await fetch(`https://googleapis.com{apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{
          parts: [
            { inlineData: { mimeType: mimeType, data: base64Data } },
            { text: promptText }
          ]
        }],
        generationConfig: { responseMimeType: "application/json" }
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(500).json({ error: "Gemini szerver hiba: " + JSON.stringify(data) });
    }

    // Kiszedjük a Gemini által visszaadott tiszta szöveges választ
    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    return res.status(200).json({ reply: reply });
    
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
