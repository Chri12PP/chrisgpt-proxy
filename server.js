import express from "express";
import fetch from "node-fetch";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
console.log("OPENAI_API_KEY:", OPENAI_API_KEY ? "Trovata ✅" : "Mancante ❌");

app.get("/", (req, res) => {
  res.send("✅ ChrisGPT Proxy streaming attivo su Render!");
});

/* -----------------------------------------------
   ENDPOINT TRIPADVISOR GRATIS (API UFFICIALE)
------------------------------------------------ */
app.get("/tripadvisor", async (req, res) => {
  const q = req.query.q;
  if (!q) return res.status(400).json({ error: "Parametro q mancante" });

  try {
    const url = 
      "https://api.content.tripadvisor.com/api/v1/location/search?key=EDE08EAB213348AD94EEA6998E0D4458&searchQuery=" +
      encodeURIComponent(q) +
      "&language=it";

    const response = await fetch(url);
    const data = await response.json();

    res.json(data);

  } catch (e) {
    res.status(500).json({ error: "Errore TripAdvisor" });
  }
});

/* -----------------------------------------------
   ENDPOINT CHATGPT STREAMING
------------------------------------------------ */
app.post("/api/chat", async (req, res) => {
  const { prompt } = req.body;
  if (!prompt) {
    res.status(400).json({ reply: "⚠️ Nessun prompt ricevuto." });
    return;
  }

  if (!OPENAI_API_KEY) {
    res.status(500).json({ reply: "❌ API key non configurata." });
    return;
  }

  try {
    console.log("🌊 Modalità streaming attiva");
    res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("Access-Control-Allow-Origin", "*");

    const upstream = await fetch("https://api.openai.com/v1/chat/completions", {
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
            content: "Sei Chris – Travel Planner di Blog di Viaggi…",
          },
          { role: "user", content: prompt },
        ],
        temperature: 0.8,
        stream: true,
      }),
    });

    if (!upstream.ok || !upstream.body) {
      const text = await upstream.text();
      console.error("Errore OpenAI:", text);
      res.write(`data: ${JSON.stringify({ error: "Errore API OpenAI" })}\n\n`);
      res.end();
      return;
    }

    const decoder = new TextDecoder("utf-8");

    for await (const chunk of upstream.body) {
      const piece = decoder.decode(chunk, { stream: true });
      res.write(piece);
    }

    res.write("data: [DONE]\n\n");
    res.end();

  } catch (err) {
    console.error("Errore proxy:", err);
    try {
      res.write(`data: ${JSON.stringify({ error: "Errore proxy" })}\n\n`);
      res.end();
    } catch (e) {
      res.end();
    }
  }
});

/* -----------------------------------------------
   AVVIO SERVER
------------------------------------------------ */
const port = process.env.PORT || 10000;
app.listen(port, () => {
  console.log(`✅ Server attivo su porta ${port}`);
});
