// api/chef-ai.js
// Si ton runtime n'a pas fetch global, décommente la ligne suivante:
// import fetch from 'node-fetch';

export default async function handler(req, res) {
  // Autoriser CORS simple (adaptable : en prod restreins le domaine)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(204).end();

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { prompt, sign, meal, lang } = req.body || {};
    if (!prompt) return res.status(400).json({ error: 'Missing prompt' });

    // Construire un prompt strict pour forcer la réponse JSON
    const system = `You are Chef-AI, an expert chef and nutritionist. Always respond in VALID JSON ONLY (no extra text).
Return a JSON object with exactly two top-level keys:
- "answer": short text (1-2 sentences) as a chat reply to the user's question.
- "recipe": an object with fields { "title", "desc", "ingredients" (array), "preparation", "cook", "calories", "img" }.
If some fields are unknown, set them to an empty string or empty array. Use the language requested in the 'lang' parameter for both 'answer' and 'recipe' text.
Do NOT include any commentary, only the JSON object.`;

    const userContent = `User prompt: """${prompt}"""
Sign: ${sign || 'unknown'}
Meal: ${meal || 'unknown'}
Lang: ${lang || 'fr'}
Return the JSON object with recipe adapted to the sign and meal.`;

    // Optional: set a server-side timeout controller for fetch
    const controller = new AbortController();
    const timeoutMs = 20000; // 20s
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    // Call OpenAI Chat Completions endpoint (adjust model / endpoint as needed)
    const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini', // ou le modèle que tu préfères
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: userContent }
        ],
        temperature: 0.8,
        max_tokens: 700
      }),
      signal: controller.signal
    });

    clearTimeout(timeout);

    if (!openaiRes.ok) {
      const text = await openaiRes.text().catch(() => '');
      console.error('OpenAI error', openaiRes.status, text);
      return res.status(502).json({ error: `OpenAI error ${openaiRes.status}` });
    }

    const json = await openaiRes.json();

    // Extraire le texte renvoyé par le modèle
    const raw = json.choices?.[0]?.message?.content ?? json.choices?.[0]?.text ?? null;
    if (!raw) {
      return res.status(500).json({ error: 'No content from OpenAI' });
    }

    // Tenter de parser JSON strict depuis la réponse
    let parsed;
    try {
      // Parfois le modèle renvoie du code markdown; on nettoie
      const firstBrace = raw.indexOf('{');
      const lastBrace = raw.lastIndexOf('}');
      const candidate = (firstBrace !== -1 && lastBrace !== -1) ? raw.slice(firstBrace, lastBrace + 1) : raw;
      parsed = JSON.parse(candidate);
    } catch (parseErr) {
      // Si parsing échoue, on renvoie le texte dans answer pour debug, et recipe vide
      console.warn('JSON parse failed, returning raw text as answer', parseErr);
      return res.status(200).json({
        answer: String(raw).slice(0, 1500), // tronqué si trop long
        recipe: {
          title: '',
          desc: '',
          ingredients: [],
          preparation: '',
          cook: '',
          calories: '',
          img: ''
        },
        warning: 'failed_to_parse_json'
      });
    }

    // Valider & normaliser parsed.recipe si nécessaire
    const recipe = parsed.recipe || {};
    const normalizedRecipe = {
      title: recipe.title || '',
      desc: recipe.desc || '',
      ingredients: Array.isArray(recipe.ingredients) ? recipe.ingredients : (recipe.ingredients ? [String(recipe.ingredients)] : []),
      preparation: recipe.preparation || '',
      cook: recipe.cook || '',
      calories: recipe.calories || '',
      img: recipe.img || ''
    };

    // Fournir la réponse finale attendue côté client
    return res.status(200).json({
      answer: parsed.answer || '',
      recipe: normalizedRecipe
    });

  } catch (err) {
    console.error('Server error', err);
    if (err.name === 'AbortError') {
      return res.status(504).json({ error: 'OpenAI request timed out' });
    }
    return res.status(500).json({ error: err.message || 'Server error' });
  }
}
