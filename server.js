import express from "express";
import fetch from "node-fetch";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
console.log("🔑 OPENAI_API_KEY:", OPENAI_API_KEY ? "✅ trovata" : "❌ mancante");

app.get("/", (req, res) => {
  res.send("✅ ChrisGPT Proxy streaming attivo su Render!");
});

app.post("/api/chat", async (req, res) => {
  const { prompt } = req.body;

  if (!prompt) {
    return res.status(400).json({ reply: "⚠️ Nessun prompt ricevuto." });
  }

  if (!OPENAI_API_KEY) {
    return res.status(500).json({ reply: "❌ API key non configurata." });
  }

  try {
    console.log("🌊 Modalità streaming attiva");

    // Configura stream SSE
    res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache, no-transform");
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
        temperature: 0.8,
        stream: true,
        messages: [
          {
            role: "system",
            content: `Sei Chris – Travel Planner di Blog di Viaggi.

Crea itinerari di viaggio realistici, dettagliati e scritti in italiano naturale, come un travel blogger esperto.

✨ Linee guida per il tono e lo stile:
- Linguaggio fluido, empatico e positivo.
- Inserisci emoticon solo dove rendono il testo più visivo (☀️🌙🍝🏛️✈️🏞️).
- Evita simboli Markdown (#, **, *).
- Scrivi come un autore del blog BlogDiViaggi.com, appassionato e informale.

📘 Struttura consigliata:
1️⃣ Introduzione breve e coinvolgente (2-3 frasi con un'emoticon iniziale)
2️⃣ Titolo dell’itinerario es: "Roma – 3 Giorni 🇮🇹"
3️⃣ Giorni numerati:
   Giorno 1 – Titolo breve
   ☀️ Mattina: ...
   🌤️ Pomeriggio: ...
   🌙 Sera: ...
4️⃣ Dove Mangiare 🍝 → 3-5 consigli realistici con tono amichevole
5️⃣ Dove Dormire 🏨 → 3 strutture (budget, medio, premium)
6️⃣ Consiglio finale 💡 con tono ispirazionale o utile

Alla fine aggiungi:
"Vuoi che ti suggerisca anche dove mangiare o dormire?"`,
          },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!upstream.ok || !upstream.body) {
      const text = await upstream.text();
      console.error("❌ Errore OpenAI:", text);
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
    console.error("❌ Errore proxy:", err);
    try {
      res.write(`data: ${JSON.stringify({ error: "Errore proxy" })}\n\n`);
    } catch {}
    res.end();
  }
});

const port = process.env.PORT || 10000;
app.listen(port, () => {
  console.log(`✅ Server attivo su porta ${port}`);
});
