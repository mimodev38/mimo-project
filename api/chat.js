export default async function handler(req, res) {
  try {
    // CORS fejléc beállítása a böngészőhöz
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") {
      return res.status(200).end();
    }

    if (req.method !== "POST") {
      return res.status(405).json({ error: "Only POST allowed" });
    }

    // OpenAI kulcs beolvasása a Vercelből
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ 
        error: "Rendszerhiba: Az 'OPENAI_API_KEY' környezeti változó hiányzik a Vercel felületéről!" 
      });
    }

    // Itt javítottuk ki: pontosan a frontend által küldött 'messages' tömböt olvassuk be
    const { messages } = req.body;
    if (!messages) {
      return res.status(400).json({ error: "Hiányzó 'messages' tartalom a kérésben!" });
    }

    // Kapcsolódás az OpenAI-hoz
    const response = await fetch("https://openai.com", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
            body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: messages,
        response_format: { type: "json_object" }
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(500).json({
        error: "OpenAI hiba: " + (data.error?.message || JSON.stringify(data))
      });
    }

    // Válasz küldése a böngészőnek
    const reply = data.choices?.[0]?.message?.content ?? "";
    return res.status(200).json({ reply: reply });
    
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
