export default async function handler(req, res) {
  try {
    // CORS engedélyezése a böngészőnek
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") {
      return res.status(200).end();
    }

    if (req.method !== "POST") {
      return res.status(405).json({ error: "Only POST allowed" });
    }

    // Itt olvassa be a képen látott Vercel kulcsodat
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ 
        error: "Hiba: Az 'OPENAI_API_KEY' környezeti változó hiányzik a Vercelből!" 
      });
    }

    const { messages } = req.body;

    // Hívás az OpenAI felé
    const response = await fetch("https://openai.com", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: messages
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(500).json({
        error: "OpenAI hiba: " + (data.error?.message || JSON.stringify(data))
      });
    }

    // Visszaküldjük a szöveget a frontendnek
    const reply = data.choices?.[0]?.message?.content ?? "";
    return res.status(200).json({ reply: reply });
    
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
