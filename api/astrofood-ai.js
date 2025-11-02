export default async function handler(req, res) {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  // Préflight
  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  // On accepte POST seulement
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Use POST" });
  }

  // 🔴 ICI on est en Node → on lit req.body (pas req.json())
  const body = req.body || {};
  const sign = body.sign || "Poissons";
  const lang = body.lang || "fr";

  const text = `✅ API ASTROFOOD OK (Node)
Signe: ${sign}
Langue: ${lang}
Recette démo: jus de bouye énergisant + tartine mil & miel.`;

  return res.status(200).json({ ok: true, text });
}

