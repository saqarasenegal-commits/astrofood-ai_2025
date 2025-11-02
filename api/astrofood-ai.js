export default async function handler(req, res) {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  // Préflight
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Use POST" });

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "Missing OPENAI_API_KEY on server" });
  }

  const body = req.body || {};
  const sign = body.sign || "Poissons";
  const lang = body.lang || "fr";

  try {
    // 🔮 Appel OpenAI temps réel
    const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `Tu es Chef-AI, un assistant culinaire astrologique d’AstroFood. 
            Tu réponds toujours de façon poétique et gastronomique.`,
          },
          {
            role: "user",
            content: `Donne une recette originale pour le signe ${sign} en ${lang}.`,
          },
        ],
        max_tokens: 300,
      }),
    });

    const data = await openaiRes.json();
    const message = data.choices?.[0]?.message?.content || "Aucune réponse reçue.";

    return res.status(200).json({ ok: true, text: message });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
