// pages/api/chef-ai.js
export default async function handler(req, res) {

  const origin = req.headers.origin || "*";
  res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Allow-Credentials", "true");

  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { sign, meal, lang, prompt } = req.body || {};
    if (!prompt) return res.status(400).json({ error: "Missing: prompt" });

    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
    if (!OPENAI_API_KEY) return res.status(500).json({ error: "Missing OPENAI_API_KEY in Vercel" });

    const finalPrompt = `
Tu es CHEF-AI. Réponds STRICTEMENT par un JSON valide :
{
  "title": "",
  "description": "",
  "ingredients": ["", ""],
  "preparation": "",
  "cook": "",
  "calories": "",
  "image_prompt": ""
}
Lang: ${lang || "fr"}, sign: ${sign || ""}, meal: ${meal || ""}
Question: ${prompt}
`;

    const aiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "You are Chef-AI, expert." },
          { role: "user", content: finalPrompt }
        ],
        max_tokens: 900,
        temperature: 0.8
      })
    });

    const data = await aiRes.json();
    if (!data.choices) return res.status(500).json({ error: "Bad OpenAI response", details: data });

    const raw = data.choices[0].message?.content?.trim?.() || data.choices[0].text || "";
    let recipeJSON;
    try { recipeJSON = JSON.parse(raw); }
    catch (err) {
      return res.status(500).json({ error: "Failed to parse JSON from model", raw });
    }

    return res.status(200).json({ ok: true, recipe: recipeJSON });

  } catch (err) {
    console.error("CHEF-AI ERROR:", err);
    return res.status(500).json({ error: err.message || "server error" });
  }
}
