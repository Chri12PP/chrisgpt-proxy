import express from "express";
import fetch from "node-fetch";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
console.log("🔍 OPENAI_API_KEY:", OPENAI_API_KEY ? "✅ trovata" : "❌ non trovata");

app.get("/", (req, res) => {
  res.send("✅ ChrisGPT Proxy streaming attivo su Render!");
});

app.post("/api/chat", async (req, res) => {
  const { prompt } = req.body;

  if (!prompt) {
    return res.status(400).json({ error: "⚠️ Nessun prompt ricevuto." });
  }

  if (!OPENAI_API_KEY) {
    return res.status(500).json({ error: "❌ API key non configurata sul server." });
  }

  // Imposta headers per lo stream
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "Sei Chris – Travel Planner di Blog di Viaggi. Genera itinerari di viaggio dettagliati in italiano, divisi per giorno, con consigli su cosa vedere, dove mangiare e dormire.",
          },
          { role: "user", content: prompt },
        ],
        temperature: 0.8,
        stream: true, // 💡 Attiva streaming
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error("❌ Errore OpenAI:", errorData);
      res.write(`data: ${JSON.stringify({ error: "Errore dalla API OpenAI" })}\n\n`);
      res.end();
      return;
    }

    // Legge lo stream e lo inoltra al client
    const decoder = new TextDecoder();
    for await (const chunk of response.body) {
      const text = decoder.decode(chunk);
      res.write(text); // inoltra chunk al browser
      res.flush(); // forza invio immediato
    }

    res.write("data: [DONE]\n\n");
    res.end();
  } catch (error) {
    console.error("❌ Errore proxy:", error);
    res.write(`data: ${JSON.stringify({ error: "Errore interno del proxy" })}\n\n`);
    res.end();
  }
});

const port = process.env.PORT || 10000;
app.listen(port, () => console.log(`✅ Server attivo su porta ${port}`));
