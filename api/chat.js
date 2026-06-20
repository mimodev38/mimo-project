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
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "Hiányzó OPENAI / OPENROUTER API kulcs a Vercel-en!" });
    }

    const { messages } = req.body;
    const userContent = messages?.[0]?.content;
    
    if (!userContent || !Array.isArray(userContent)) {
      return res.status(400).json({ error: "Hiányzó vagy sérült adatformátum a kérésben!" });
    }

    // Kapcsolódás a regionális tiltásoktól mentes OpenRouter hálózathoz
    const response = await fetch("https://openrouter.ai", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey.trim()}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "google/gemini-1.5-flash:free", // Az ingyenes, stabil Gemini 1.5 Flash modell meghívása
        messages: [{ role: "user", content: userContent }]
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      return res.status(response.status).json({ error: `OpenRouter hálózati elutasítás: ${errText}` });
    }

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content ?? "";
    
    return res.status(200).json({ reply: reply });
    
  } catch (err) {
    return res.status(500).json({ error: "Szerveroldali hiba: " + err.message });
  }
}
