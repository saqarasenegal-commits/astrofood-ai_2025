// pages/api/chef-ai.js
export default async function handler(req, res) {
  // Origin de la requête (echo) — si tu veux restreindre, remplace ORIGIN par ton domaine exact
  const ORIGIN = req.headers.origin || '*';

  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', ORIGIN);
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  // Répondre au preflight
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  try {
    // Test minimal — remplace par ta logique OpenAI plus tard
    const key = process.env.OPENAI_API_KEY || null;
    return res.status(200).json({
      ok: true,
      message: "API CORS OK",
      method: req.method,
      key_present: !!key,
      key_len: key ? key.length : 0
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err?.message || 'server error' });
  }
}
