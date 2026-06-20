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
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "Hiányzó OPENROUTER_API_KEY a Vercel-en!" });
    }

    const { messages } = req.body;
    const userContent = messages?.[0]?.content;
    
    if (!userContent || !Array.isArray(userContent)) {
      return res.status(400).json({ error: "Hiányzó vagy sérült adatformátum!" });
    }

    const imagePart = userContent.find(c => c.type === 'image_url');
    const textPart = userContent.find(c => c.type === 'text');

    if (!imagePart || !imagePart.image_url?.url) {
      return res.status(400).json({ error: "Nem található kép a kérésben!" });
    }

    // Képadatok tiszta szétválasztása
    const dataUrl = imagePart.image_url.url;
    const mimeType = dataUrl.substring(dataUrl.indexOf(":") + 1, dataUrl.indexOf(";"));
    const base64Data = dataUrl.substring(dataUrl.indexOf(",") + 1);
    const promptText = textPart?.text || "Extract JSON.";

    // ITT JAVÍTVA: Az OpenRouter hivatalos, többváltozós (multimodal) üzenetformátumát használjuk
    const response = await fetch("https://openrouter.ai", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey.trim()}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash:free",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: promptText
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:${mimeType};base64,${base64Data}`
                }
              }
            ]
          }
        ]
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      return res.status(response.status).json({ error: `OpenRouter elutasítás: ${errText}` });
    }

    const data = await response.json();
    
    // Ha az OpenRouter üres vagy hibás választ adna vissza, lekezeljük
    if (!data.choices || data.choices.length === 0) {
      return res.status(500).json({ error: "Az OpenRouter nem küldött értékelhető választ: " + JSON.stringify(data) });
    }

    const reply = data.choices[0]?.message?.content ?? "";
    return res.status(200).json({ reply: reply });
    
  } catch (err) {
    return res.status(500).json({ error: "Szerveroldali hiba: " + err.message });
  }
}
