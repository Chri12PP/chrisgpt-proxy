import express from "express";
import fetch from "node-fetch";
import cors from "cors";

const app = express();

// ✅ Abilita CORS di base
app.use(cors());
app.use(express.json());

// ✅ CORS universale per tutte le richieste
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.sendStatus(200);
  next();
});

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
console.log("🔍 OPENAI_API_KEY:", OPENAI_API_KEY ? "✅ trovata" : "❌ non trovata");

// ✅ Endpoint base di test
app.get("/", (req, res) => {
  res.send("✅ ChrisGPT Proxy streaming attivo su Render!");
});

// ✅ Endpoint principale
app.post("/api/chat", async (req, res) => {
  const { prompt } = req.body;

  if (!prompt) {
    return res.status(400).json({ reply: "⚠️ Nessun prompt ricevuto." });
  }

  if (!OPENAI_API_KEY) {
    return res
      .status(500)
      .json({ reply: "❌ API key non configurata sul server." });
  }

  try {
    console.log("🌊 Modalità streaming attiva");

    // Headers per SSE
    res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.setHeader("Access-Control-Allow-Origin", "*");

    if (typeof res.flushHeaders === "function") res.flushHeaders();

    // 🔗 Chiamata a OpenAI
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
            content:
              "Sei Chris – Travel Planner di Blog di Viaggi. Genera itinerari dettagliati in italiano, divisi per giorno, con consigli su cosa vedere, dove mangiare e dove dormire.",
          },
          { role: "user", content: prompt },
        ],
        temperature: 0.8,
        stream: true,
      }),
    });

    if (!upstream.ok || !upstream.body) {
      const text = await upstream.text();
      console.error("❌ Errore OpenAI:", text);
      res.write(
        `data: ${JSON.stringify({ error: "Errore dalla API OpenAI" })}\n\n`
      );
      res.end();
      return;
    }

    // 🔄 Trasmetti i chunk in streaming al client
    const decoder = new TextDecoder("utf-8");

    for await (const chunk of upstream.body) {
      const piece = decoder.decode(chunk, { stream: true });
      const parts = piece.split(/\n\n/);

      for (let p of parts) {
        if (!p) continue;
        if (p.trim().startsWith("data:")) {
          res.write(p.trim() + "\n\n");
        } else {
          res.write("data: " + p.trim() + "\n\n");
        }

        if (typeof res.flush === "function") res.flush();
      }
    }

    // ✅ Fine dello stream
    res.write("data: [DONE]\n\n");
    res.end();
  } catch (error) {
    console.error("❌ Errore proxy:", error);
    try {
      res.write(
        `data: ${JSON.stringify({ error: "Errore interno del proxy" })}\n\n`
      );
    } catch {}
    res.end();
  }
});

// ✅ Avvio server
const port = process.env.PORT || 10000;
app.listen(port, () => console.log(`✅ Server attivo su porta ${port}`));

