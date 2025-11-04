// api/chef-image.js
export const config = { runtime: 'edge' };

export default async function handler(req) {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: cors() });
  }
  if (req.method !== 'POST') {
    return json({ error: 'Use POST' }, 405);
  }

  let body = {};
  try { body = await req.json(); } catch {}

  const { title='Recette', ingredients=[], steps=[] } = body;
  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

  // ✅ Mode test sans clé : renvoie un placeholder
  if (!OPENAI_API_KEY) {
    const ph = 'data:image/svg+xml;utf8,' + encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 500">
         <defs><linearGradient id="g" x1="0" x2="1"><stop stop-color="#201a3a"/><stop offset="1" stop-color="#0b1220"/></linearGradient></defs>
         <rect width="800" height="500" fill="url(#g)"/>
         <text x="50%" y="48%" fill="#FBBF24" font-size="26" font-family="sans-serif" text-anchor="middle">AstroFood – Placeholder</text>
         <text x="50%" y="58%" fill="#ffffff" font-size="15" font-family="sans-serif" text-anchor="middle">Ajoute OPENAI_API_KEY dans Vercel</text>
       </svg>`
    );
    return json({ ok:true, image: ph, placeholder:true });
  }

  const prompt = [
    `Food photography of: ${title}.`,
    ingredients.length ? `Key ingredients: ${ingredients.join(', ')}.` : '',
    steps.length ? `Method: ${steps.slice(0,3).join(' ')}.` : '',
    'Ultra-realistic, natural light, appetizing plating, shallow depth of field, 4k, editorial food magazine, no text.'
  ].filter(Boolean).join(' ');

  try {
    const resp = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gpt-image-1',
        prompt,
        size: '1024x768',
        response_format: 'b64_json'
      })
    });

    if (!resp.ok) {
      const details = await resp.text();
      return json({ ok:false, error:'OpenAI error', details }, resp.status);
    }

    const out = await resp.json();
    const b64 = out?.data?.[0]?.b64_json;
    if (!b64) return json({ ok:false, error:'No image returned' }, 502);

    return json({ ok:true, image:`data:image/png;base64,${b64}` });
  } catch (e) {
    return json({ ok:false, error: String(e) }, 500);
  }
}

function json(obj, status=200){
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type':'application/json', ...cors() }
  });
}
function cors(){
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  };
}
