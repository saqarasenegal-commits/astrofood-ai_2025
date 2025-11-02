<script>
  const API_URL = "/api/astrofood-ai";
  const out = document.getElementById("ai-output");

  document.getElementById("btn-recipe").addEventListener("click", async () => {
    const sign = document.getElementById("sign").value;
    const lang = document.getElementById("lang").value;
    out.textContent = "🍳 Génération...";
    try {
      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sign, lang })
      });
      const data = await res.json();
      out.textContent = data.text || JSON.stringify(data, null, 2);
    } catch (e) {
      out.textContent = "❌ Impossible d'appeler l'API : " + e.message;
    }
  });
</script>
