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
    return res.status(400).json({ reply: "⚠️ Nessun prompt ricevuto." });
  }

  if (!OPENAI_API_KEY) {
    return res.status(500).json({ reply: "❌ API key non configurata sul server." });
  }

  try {
    console.log("🌊 Modalità streaming attiva");

    // headers per SSE + prevenire buffering dai reverse proxy
    res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no"); // per nginx / render buffer
    res.setHeader("Access-Control-Allow-Origin", "*");

    // invia gli header immediatamente
    if (typeof res.flushHeaders === "function") res.flushHeaders();

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
      res.write(`data: ${JSON.stringify({ error: "Errore dalla API OpenAI" })}\n\n`);
      res.end();
      return;
    }

    const decoder = new TextDecoder("utf-8");

    // Legge chunk per chunk dall'upstream e normalizza gli eventi SSE verso il client
    for await (const chunk of upstream.body) {
      const piece = decoder.decode(chunk, { stream: true });

      // upstream spesso invia già righe "data: {...}\n\n" — ma normalizziamo:
      // spezza su doppio newline, invia ogni "event" al client garantendo '\n\n'
      const parts = piece.split(/\n\n/);
      for (let p of parts) {
        if (!p) continue;
        // se la parte già contiene "data:" la inoltriamo così com'è, altrimenti la wrappiamo
        if (p.trim().startsWith("data:")) {
          try {
            res.write(p.trim() + "\n\n");
          } catch {}
        } else {
          // proviamo a estrarre json se presente; altrimenti lo inviamo come data raw
          try {
            // prova a parsare in caso sia json-like (no throw if not json)
            const maybe = p.trim();
            if (maybe) res.write("data: " + maybe + "\n\n");
          } catch {
            res.write("data: " + p + "\n\n");
          }
        }
        // forza flush se disponibile (aiuta a non bufferizzare nei reverse proxy)
        try {
          if (typeof res.flush === "function") res.flush();
        } catch {}
      }
    }

    // fine stream
    res.write("data: [DONE]\n\n");
    res.end();
  } catch (error) {
    console.error("❌ Errore proxy:", error);
    try {
      res.write(`data: ${JSON.stringify({ error: "Errore interno del proxy" })}\n\n`);
    } catch {}
    res.end();
  }
});

const port = process.env.PORT || 10000;
app.listen(port, () => console.log(`✅ Server attivo su porta ${port}`));
