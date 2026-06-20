import OpenAI from 'openai';

export default async function handler(req, res) {
  // CORS biztonsági fejlécek a böngészőhöz
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
      return res.status(500).json({ error: "Hiányzó OPENAI_API_KEY beállítás a Vercel-en!" });
    }

    // Inicializáljuk a hivatalos OpenAI klienst
    const openai = new OpenAI({ apiKey: apiKey });

    const { messages } = req.body;
    if (!messages) {
      return res.status(400).json({ error: "Hiányzó 'messages' tartalom!" });
    }

    // Hivatalos, biztonságos API hívás
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: messages
    });

    const reply = completion.choices[0]?.message?.content ?? "";
    return res.status(200).json({ reply: reply });
    
  } catch (err) {
    // Ha az OpenAI hibát dob, azt szövegesen küldjük vissza, így nem lesz JSON hiba a kliensen
    return res.status(500).json({ error: "Szerveroldali OpenAI hiba: " + err.message });
  }
}
