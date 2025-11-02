export default async function handler(req, res) {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(204).end();

  // 🕵️ on essaie de trouver une clé OpenAI même si le nom n'est pas parfait
  const envKeys = Object.keys(process.env || {});
  const openaiLike = envKeys.filter(k => k.toLowerCase().includes("openai"));
  // priorité au nom "officiel"
  let apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey && openaiLike.length > 0) {
    // on prend la première trouvée
    apiKey = process.env[openaiLike[0]];
  }

  // 🔎 mode debug
  if (req.method === "GET") {
    const isDebug =
      (req.query && req.query.debug === "1") ||
      (req.url && req.url.includes("debug=1"));

    if (isDebug) {
      return res.status(200).json({
        ok: true,
        message: "Debug AstroFood API",
        hasKey: !!apiKey,
        keyPreview: apiKey ? apiKey.slice(0, 6) + "..." : null,
        env: process.env.VERCEL_ENV || "unknown",
        foundEnvNames: openaiLike, // 👈 on te montre ce que Vercel voit vraiment
        note: openaiLike.length === 0
          ? "Aucune variable contenant 'openai' trouvée sur CE projet. Ajoute-en une."
          : "On a trouvé au moins une variable contenant 'openai'. Le code va l'utiliser."
      });
    }

    return res.status(405).json({ error: "Use POST" });
  }

  // à partir d'ici : POST normal
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Use POST" });
  }

  const body = req.body || {};
  const sign = body.sign || "Poissons";
  const lang = body.lang || "fr";

  // pas de clé DU TOUT
  if (!apiKey) {
    return res.status(200).json({
      ok: false,
      text: `⚠️ IA non activée sur le serveur (aucune variable d'environnement contenant "openai" trouvée).
Tu as demandé : ${sign} (${lang}).
➡️ Dans Vercel → Settings → Environment Variables, ajoute par ex. "OPENAI_API_KEY" avec ta clé, puis redeploy.`
    });
  }

  // 🔮 appel OpenAI
  try {
    const aiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "Tu es Chef-AI d'AstroFood. Tu donnes des recettes astro courtes avec des touches sénégalaises/africaines."
          },
          {
            role: "user",
            content: `Donne une recette pour le signe ${sign} en ${lang}.`
          }
        ],
        max_tokens: 280
      })
    });

    const data = await aiRes.json();
    const content = data?.choices?.[0]?.message?.content;

    if (!content) {
      return res.status(200).json({
        ok: false,
        text: "⚠️ OpenAI a répondu sans contenu. Vérifie ton compte ou ta clé.",
        raw: data
      });
    }

    return res.status(200).json({ ok: true, text: content });
  } catch (err) {
    return res.status(200).json({
      ok: false,
      text: "❌ Erreur lors de l'appel OpenAI : " + err.message
    });
  }
}

