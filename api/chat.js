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
    
    // Javítva az elütés, tiszta változóhívás
    const response = await fetch("https://openrouter.ai", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey.trim()}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://vercel.app", 
        "X-Title": "Mimo Project"                            
      },
      body: JSON.stringify({
        // A te általad választott stabil, látás-képes Mistral modell az OpenRouteren
        model: "mistralai/pixtral-12b:free",
        messages: messages
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      return res.status(response.status).json({ error: `OpenRouter hiba: ${errText}` });
    }

    const data = await response.json();
    // Javítva az elütés a válasz kiolvasásánál
    const reply = data.choices?.[0]?.message?.content || "";
    
    return res.status(200).json({ reply: reply });
    
  } catch (err) {
    return res.status(500).json({ error: "Szerveroldali hiba: " + err.message });
  }
}


