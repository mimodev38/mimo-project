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

    const claudeBody = req.body;
    const userBlock = (claudeBody.messages || [])[0] || { content: [] };

    // ---- IMAGE LIMIT + CONVERT ----
    const openaiContent = (userBlock.content || []).map((block) => {
      if (block.type === "image") {
        const base64 = block?.source?.data || "";

        // 🛡️ extra védelem nagy képek ellen
        if (base64.length > 2_000_000) {
          return {
            type: "text",
            text: "[A kép túl nagy volt, ezért nem lett elküldve a modellnek]"
          };
        }

        return {
          type: "image_url",
          image_url: {
            url: `data:${block.source.media_type};base64,${base64}`
          }
        };
      }

      if (block.type === "document") {
        return {
          type: "text",
          text: "[PDF csatolva – ezt a proxy nem dolgozza fel]"
        };
      }

      return block;
    });

    const openaiMessages = [];
    if (claudeBody.system) {
      openaiMessages.push({ role: "system", content: claudeBody.system });
    }

    openaiMessages.push({
      role: "user",
      content: openaiContent
    });

    // ---- RETRY LOGIKA 429-RE ----
    async function callOpenAI(body, apiKey, retries = 3) {
      for (let i = 0; i < retries; i++) {
        const response = await fetch(
          "https://api.openai.com/v1/chat/completions",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${apiKey}`
            },
            body: JSON.stringify(body)
          }
        );

        const data = await response.json();

        if (response.ok) return data;

        console.log("OPENAI ERROR:", JSON.stringify(data, null, 2));

        // 429 retry (rate limit)
        if (response.status === 429) {
          const wait = 500 * Math.pow(2, i); // 500ms → 1s → 2s
          await new Promise((r) => setTimeout(r, wait));
          continue;
        }

        throw new Error(JSON.stringify(data));
      }

      throw new Error("OpenAI rate limit exceeded after retries");
    }

    const data = await callOpenAI(
      {
        model: "gpt-4o-mini",
        max_tokens: claudeBody.max_tokens || 1500,
        messages: openaiMessages
      },
      apiKey
    );

    const text = data?.choices?.[0]?.message?.content || "";

    return res.status(200).json({
      content: [{ type: "text", text }]
    });
  } catch (err) {
    console.error("HANDLER ERROR:", err);
    return res.status(500).json({ error: err.message });
  }
}
