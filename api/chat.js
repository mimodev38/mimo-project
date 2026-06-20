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
      return res.status(500).json({
        error: "Hiányzik az OPENAI_API_KEY a Vercel beállításokból."
      });
    }

    const body = req.body;
    const userBlock = (body.messages || [])[0] || { content: [] };

    // =========================
    // SAFE CONTENT CONVERSION
    // =========================
    const openaiContent = (userBlock.content || [])
      .map((block) => {
        if (!block || !block.type) return null;

        // TEXT
        if (block.type === "text") {
          return {
            type: "text",
            text: block.text || ""
          };
        }

        // IMAGE
        if (block.type === "image") {
          const base64 = block?.source?.data;
          if (!base64) return null;

          // túl nagy kép skip
          if (base64.length > 2_000_000) {
            return {
              type: "text",
              text: "[Kép túl nagy, kihagyva]"
            };
          }

          return {
            type: "image_url",
            image_url: {
              url: `data:${block.source.media_type};base64,${base64}`
            }
          };
        }

        // PDF / DOCUMENT
        if (block.type === "document") {
          return {
            type: "text",
            text: `[PDF csatolva: nem kerül feldolgozásra]`
          };
        }

        return null;
      })
      .filter(Boolean);

    // ha üres lenne
    if (openaiContent.length === 0) {
      openaiContent.push({
        type: "text",
        text: "Nincs feldolgozható tartalom."
      });
    }

    const openaiMessages = [];

    if (body.system) {
      openaiMessages.push({
        role: "system",
        content: body.system
      });
    }

    openaiMessages.push({
      role: "user",
      content: openaiContent
    });

    // =========================
    // OPENAI CALL WITH RETRY
    // =========================
    async function callOpenAI(payload, retries = 3) {
      for (let i = 0; i < retries; i++) {
        const response = await fetch(
          "https://api.openai.com/v1/chat/completions",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${apiKey}`
            },
            body: JSON.stringify(payload)
          }
        );

        const data = await response.json();

        // siker
        if (response.ok) return data;

        console.error("OPENAI ERROR:", data);

        // rate limit retry
        if (response.status === 429) {
          const wait = 500 * Math.pow(2, i);
          await new Promise((r) => setTimeout(r, wait));
          continue;
        }

        throw new Error(data?.error?.message || JSON.stringify(data));
      }

      throw new Error("OpenAI rate limit exceeded");
    }

    // =========================
    // REQUEST
    // =========================
    const data = await callOpenAI({
      model: "gpt-4o-mini",
      max_tokens: body.max_tokens || 1500,
      messages: openaiMessages
    });

    const text = data?.choices?.[0]?.message?.content || "";

    return res.status(200).json({
      content: [{ type: "text", text }]
    });
  } catch (err) {
    console.error("HANDLER ERROR:", err);
    return res.status(500).json({
      error: err.message
    });
  }
}
