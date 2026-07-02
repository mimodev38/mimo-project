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
      return res.status(200).json({ error: "Hiányzó OPENROUTER_API_KEY a Vercel-en!" });
    }

    const { messages } = req.body;

    const openRouterResponse = await fetch("https://openrouter.ai", {
      method: "POST",
      headers: {
        "Authorization": "Bearer " + apiKey.trim(),
        "Content-Type": "application/json",
        "HTTP-Referer": "https://vercel.app", 
        "X-Title": "Mimo Project"                            
      },
      body: JSON.stringify({
        // JAVÍTVA: Átváltva a Meta Llama 3.2 11B teljesen ingyenes képes modelljére, aminek nincs korlátja!
        model: "meta-llama/llama-3.2-11b-vision-instruct:free",
        messages: messages
      })
    });

    const resText = await openRouterResponse.text();

    if (!openRouterResponse.ok) {
      return res.status(200).json({ error: "OpenRouter hiba: " + resText });
    }

    const data = JSON.parse(resText);
    
    // Atombiztos kiolvasás, ha a struktúra változna
    const reply = data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content ? data.choices[0].message.content : "";
    
    if (!reply) {
      return res.status(200).json({ error: "Az OpenRouter üres választ küldött vissza. Nyers szerver válasz: " + resText });
    }
    
    return res.status(200).json({ reply: reply });
    
  } catch (err) {
    return res.status(200).json({ error: "Szerveroldali hiba: " + err.message });
  }
}



