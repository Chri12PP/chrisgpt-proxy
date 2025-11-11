app.post("/api/chat", async (req, res) => {
  const { prompt } = req.body;
  if (!prompt) return res.status(400).json({ reply: "⚠️ Nessun prompt ricevuto." });

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
      }),
    });

    const data = await response.json();
    const reply = data?.choices?.[0]?.message?.content?.trim() || "❌ Nessuna risposta.";
    res.json({ reply });
  } catch (err) {
    console.error("Errore proxy:", err);
    res.status(500).json({ reply: "Errore del server proxy." });
  }
});
