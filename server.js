import express from "express";
import fetch from "node-fetch";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
console.log("🔍 OPENAI_API_KEY:", OPENAI_API_KEY ? "✅ trovata" : "❌ non trovata");

app.get("/", (req, res) => {
  res.send("✅ ChrisGPT Proxy attivo su Render!");
});

app.post("/api/chat", async (req, res) => {
  const { prompt } = req.body;
  console.log("📩 Prompt ricevuto:", prompt);

  if (!prompt) {
    return res.status(400).json({ reply: "⚠️ Nessun prompt ricevuto." });
  }

  if (!OPENAI_API_KEY) {
    return res.status(500).json({ reply: "❌ API key non configurata sul server." });
  }

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
              "Sei Chris – Travel Planner di Blog di Viaggi. Genera itinerari dettagliati in italiano, divisi per giorno, con suggerimenti su cosa vedere, dove mangiare e dove dormire.",
          },
          { role: "user", content: prompt },
        ],
        temperature: 0.8,
      }),
    });

    const text = await response.text();

    // tenta parsing sicuro, anche se parziale
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      console.error("⚠️ JSON incompleto ricevuto da OpenAI");
      // Prova a chiudere la stringa per recuperare il messaggio parziale
      const safe = text.replace(/(\r\n|\n|\r)/gm, "").replace(/\}[^}]*$/, "}");
      try {
        data = JSON.parse(safe);
      } catch {
        data = null;
      }
    }

    if (!data || !data.choices) {
      console.error("❌ Risposta non valida o troncata:", text.slice(0, 200));
      return res.status(500).json({ reply: "❌ Nessuna risposta valida da OpenAI." });
    }

    const reply =
      data.choices[0]?.message?.content?.trim() ||
      "❌ Nessuna risposta ricevuta da OpenAI.";

    console.log("✅ Itinerario generato con successo.");
    res.json({ reply });
  } catch (error) {
    console.error("❌ Errore proxy:", error);
    res.status(500).json({ reply: "Errore interno del proxy." });
  }
});

const port = process.env.PORT || 10000;
app.listen(port, () => console.log(`✅ Server attivo su porta ${port}`));
