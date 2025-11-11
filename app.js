import express from "express";
import cors from "cors";
import fetch from "node-fetch";

const app = express();

// ✅ Abilita CORS da qualsiasi dominio (incluso il tuo blog)
app.use(cors({ origin: "*" }));
app.use(express.json());

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

app.get("/", (req, res) => {
  res.send("✅ ChrisGPT proxy attivo su Render!");
});

app.post("/ask", async (req, res) => {
  const { prompt } = req.body;
  if (!prompt) {
    return res.status(400).json({ error: "Prompt mancante." });
  }

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "Sei Chris, il Travel Planner di Blog di Viaggi. Rispondi in italiano, crea itinerari giorno per giorno con dove dormire e mangiare, e chiudi con un JSON {destinazione, luoghi, parole_chiave}."
          },
          { role: "user", content: prompt }
        ]
      })
    });

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content || "Nessuna risposta disponibile.";
    res.json({ reply: text });

  } catch (error) {
    console.error("❌ Errore nel proxy ChrisGPT:", error);
    res.status(500).json({ error: "Errore interno del server ChrisGPT." });
  }
});

app.listen(process.env.PORT || 3000, () => {
  console.log(`✅ ChrisGPT proxy attivo su porta ${process.env.PORT || 3000}`);
});
