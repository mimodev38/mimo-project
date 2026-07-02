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
    const apiKey = process.env.OPENROUTER_API_KEY; // Megtartjuk a Vercel változó nevet, hogy ne kelljen ott átírnod!
    if (!apiKey) {
      return res.status(500).json({ error: "Hiányzó API kulcs a Vercel-en!" });
    }

    const { messages } = req.body;
    
    // Átalakítjuk a script.js által küldött adatot a hivatalos Google formátumra
    const userMessage = messages?.[0];
    const textContent = userMessage?.content?.find(c => c.type === "text")?.text || "";
    const imageUrl = userMessage?.content?.find(c => c.type === "image_url")?.image_url?.url || "";
    
    // Kivágjuk a base64 fejlécét, mert a Google-nek csak a tiszta adat kell
    const base64Data = imageUrl.split(",")[1] || "";

    // Közvetlen hívás a hivatalos, ingyenes Google Gemini API felé!
    const response = await fetch(`https://googleapis.com{apiKey.trim()}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: textContent },
            {
              inlineData: {
                mimeType: "image/jpeg",
                data: base64Data
              }
            }
          ]
        }]
      })
    });

    const resText = await response.text();

    if (!response.ok) {
      return res.status(400).json({ error: "Google API elutasítás: " + resText });
    }

    const data = JSON.parse(resText);
    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    
    return res.status(200).json({ reply: reply });
    
  } catch (err) {
    return res.status(500).json({ error: "Szerveroldali hiba: " + err.message });
  }
}

