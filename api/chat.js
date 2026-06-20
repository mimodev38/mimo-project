export const config = {
  runtime: 'edge',
};

export default async function handler(req) {
  // CORS (OPTIONS) kérések kezelése a böngésző biztonsága miatt
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      }
    });
  }

  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Only POST allowed" }), { status: 405 });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "Hiányzó OPENAI_API_KEY a Vercelből!" }), { status: 500 });
    }

    // Edge környezetben így kell beolvasni a beküldött adatokat
    const { messages } = await req.json();
    if (!messages) {
      return new Response(JSON.stringify({ error: "Hiányzó messages tömb!" }), { status: 400 });
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
        messages: messages
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return new Response(JSON.stringify({ error: "OpenAI hiba: " + (data.error?.message || JSON.stringify(data)) }), { status: 500 });
    }

    const reply = data.choices?.[0]?.message?.content ?? "";

    // Válasz visszaküldése a böngészőnek CORS fejlécekkel
    return new Response(JSON.stringify({ reply: reply }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type"
      }
    });
    
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}
