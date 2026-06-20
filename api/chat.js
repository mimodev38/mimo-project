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
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "Rendszerhiba: Hiányzik az OPENAI_API_KEY a Vercelből!" });
    }

    const { messages } = req.body;

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
      return res.status(500).json({ error: "OpenAI hiba: " + (data.error?.message || JSON.stringify(data)) });
    }

    return res.status(200).json({ reply: data.choices?.[0]?.message?.content ?? "" });
    
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
