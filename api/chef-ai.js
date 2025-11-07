
// api/chef-ai.js (debug version) - REMPLACE TEMPORAIREMENT
export default async function handler(req, res) {
  res.setHeader("Content-Type", "application/json");
  // Allow CORS for quick debug if testing from browser
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(204).end();

  console.log("===== /api/chef-ai called =====");
  const key = process.env.OPENAI_API_KEY;
  console.log("🔑 OPENAI_API_KEY present?", !!key, "len:", key ? key.length : 0);

  if (!key) {
    console.error("❌ NO OPENAI_API_KEY in env");
    return res.status(500).json({ error: "NO_OPENAI_API_KEY_IN_ENV" });
  }

  // parse body safely
  let body = {};
  try { body = req.body && Object.keys(req.body).length ? req.body : (await (async () => { try { return JSON.parse(await new Promise(r => { let s=''; req.on('data',c=>s+=c); req.on('end', ()=>r(s)); })) } catch(e){ return {}; }})()) : {}; }
  catch(e){ console.warn("⚠️ parse body failed", e); body = {}; }

  console.log("📥 Received body keys:", Object.keys(body));

  // Minimal prompt check
  if (!body.prompt) {
    return res.status(400).json({ error: "Missing prompt" });
  }

  try {
    console.log("🌍 Calling OpenAI...");
    const openaiResp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${key}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "You are Chef-AI. Return JSON." },
          { role: "user", content: `${body.prompt} (lang:${body.lang||'fr'} meal:${body.meal||''})` }
        ],
        max_tokens: 700,
        temperature: 0.8
      }),
      // small timeout fallback for fetch (if runtime supports AbortController)
    });

    console.log("✅ OpenAI HTTP status:", openaiResp.status);

    const text = await openaiResp.text();
    console.log("📦 OpenAI body (first 200 chars):", text.slice(0,200));

    // if not OK forward full body as JSON with status
    if (!openaiResp.ok) {
      return res.status(502).json({ error: "OpenAI error", status: openaiResp.status, body: text });
    }

    // try parse
    let parsed;
    try { parsed = JSON.parse(text); } catch(e){ parsed = { raw: text }; }

    return res.status(200).json({ ok: true, openai_status: openaiResp.status, openai_body: parsed });
  } catch (err) {
    // Log full error
    console.error("💥 ERROR calling OpenAI:", String(err));
    // If Node threw a dns / network error, show it
    return res.status(500).json({ error: "CALL_FAILED", message: String(err) });
  }
}
