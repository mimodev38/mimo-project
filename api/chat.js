export default async function handler(req, res) {
  try {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") {
      return res.status(200).end();
    }
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "Hiányzik az OPENAI_API_KEY a Vercel beállításokból." });
    }

    const claudeBody = req.body;
    const userBlock = (claudeBody.messages || [])[0] || { content: [] };

    const openaiContent = (userBlock.content || []).map(block => {
      if (block.type === "image") {
        return {
          type: "image_url",
          image_url: { url: `data:${block.source.media_type};base64,${block.source.data}` }
        };
      }
      if (block.type === "document") {
        return { type: "text", text: "[PDF csatolva, de ez a végpont csak képet tud olvasni belőle.]" };
      }
      return block;
    });

    const openaiMessages = [];
    if (claudeBody.system) openaiMessages.push({ role: "system", content: claudeBody.system });
    openaiMessages.push({ role: "user", content: openaiContent });

const response = await fetch("https://api.openai.com/v1/chat/completions", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${apiKey}`
  },
  body: JSON.stringify({
    model: "gpt-4o-mini",
    max_tokens: claudeBody.max_tokens || 1500,
    messages: openaiMessages
  })
});

    const data = await response.json();
    if (!response.ok) return res.status(response.status).json(data);

    const text = data.choices?.[0]?.message?.content || "";
    return res.status(200).json({ content: [{ type: "text", text }] });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
}
