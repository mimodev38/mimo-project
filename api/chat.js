export default async function handler(req, res) {
  try {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") {
      return res.status(200).end();
    }

    if (req.method !== "POST") {
      return res.status(405).json({ error: "Only POST allowed" });
    }

    const { message } = req.body;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: message }]
      })
    });

const data = await response.json();

if (!response.ok) {
  const err = await response.text();

  return res.status(500).json({
    reply: "API hiba történt: " + err
  });
}

const reply =
  data.choices?.[0]?.message?.content ??
  JSON.stringify(data);

return res.status(200).json({
  reply: reply
});
    
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
