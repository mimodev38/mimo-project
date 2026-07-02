export default async function handler(req, res) {
  // CORS fejlécek beállítása a biztonságos eléréshez
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

    // Hívás az OpenRouter felé a leggyorsabb ingyenes képes modellel
    const response = await fetch("https://openrouter.ai", {
      method: "POST",
      headers: {
        "Authorization": "Bearer " + apiKey.trim(),
        "Content-Type": "application/json",
        "HTTP-Referer": "https://vercel.app", 
        "X-Title": "Mimo Project"                            
      },
      body: JSON.stringify({
        // ÁTVÁLTVA: Az OpenRouter legstabilabb ingyenes látás-modelljére
        model: "google/gemini-2.5-flash:free",
        messages: messages
      })
    });

    const resText = await response.text();

    if (!response.ok) {
      return res.status(response.status).json({ error: "OpenRouter elutasítás: " + resText });
    }

    const data = JSON.parse(resText);
    const reply = data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content ? data.choices[0].message.content : "";
    
    return res.status(200).json({ reply: reply });
    
  } catch (err) {
    return res.status(500).json({ error: "Szerveroldali hiba: " + err.message });
  }
}


