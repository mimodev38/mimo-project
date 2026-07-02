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
      return res.status(500).json({ error: "Hiányzó API kulcs a Vercel-en!" });
    }

    const { messages } = req.body;
    
    const userMessage = messages && messages[0] ? messages[0] : null;
    const textContent = userMessage && userMessage.content ? userMessage.content.find(c => c.type === "text")?.text || "" : "";
    const imageUrl = userMessage && userMessage.content ? userMessage.content.find(c => c.type === "image_url")?.image_url?.url || "" : "";
    
    // Tiszta Base64 kinyerése a fejléc nélkül
    let base64Data = "";
    if (imageUrl.includes(",")) {
      base64Data = imageUrl.split(",")[1];
    } else {
      base64Data = imageUrl;
    }

    // JAVÍTVA: A hivatalos v1-es stabil Google Gemini API végpont
    const targetUrl = `https://googleapis.com{apiKey.trim()}`;

    const response = await fetch(targetUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: textContent },
            {
              inlineData: {
                mimeType: "image/jpeg",
                data: base64Data
              }
            }
          ]
        }]
      })
    });

    const resText = await response.text();

    if (!response.ok) {
      return res.status(400).json({ error: "Google API elutasítás: " + resText });
    }

    const data = JSON.parse(resText);
    const reply = data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts && data.candidates[0].content.parts[0] ? data.candidates[0].content.parts[0].text : "";
    
    return res.status(200).json({ reply: reply });
    
  } catch (err) {
    return res.status(500).json({ error: "Szerveroldali hiba: " + err.message });
  }
}

