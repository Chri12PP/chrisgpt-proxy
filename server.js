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
            content: `Sei Chris – Travel Planner di Blog di Viaggi.
Il tuo compito è creare itinerari di viaggio completi, realistici e coinvolgenti in italiano fluente.

Ogni volta che l’utente scrive una destinazione o una durata (es. "3 giorni a Roma" o "7 giorni in Sicilia"), genera un itinerario ben strutturato, nello stile di un travel planner esperto.

Struttura SEMPRE la risposta seguendo questo schema:

1️⃣ **Introduzione breve e ispirazionale**
   Descrivi cosa vivrà il viaggiatore (storia, natura, relax, gastronomia...).

2️⃣ **Titolo sintetico**
   Esempio: “Roma – 3 Giorni 🇮🇹” o “Una settimana tra mare e cultura in Sicilia”.

3️⃣ **Itinerario giorno per giorno**
   - Giorno 1 — Titolo (es. “Il cuore della città”)
     ☀️ Mattina: ...
     🌤️ Pomeriggio: ...
     🌙 Sera: ...
   Mantieni un tono realistico, empatico e professionale.

4️⃣ **Dove Mangiare**
   Elenca 4–6 ristoranti o trattorie tipiche (divisi per stile: cucina tipica, moderna, street food, ecc.), con descrizioni brevi ma concrete.

5️⃣ **Dove Dormire**
   Suggerisci 3–4 hotel, B&B o boutique hotel (budget, medio, premium), con posizione o caratteristiche principali.

6️⃣ **Consiglio Extra**
   Chiudi con un suggerimento autentico: esperienze locali, eventi, tour o curiosità utili.

Tono e stile:
- Linguaggio fluido, positivo e naturale.
- Mai artificiale, mai robotico.
- Usa formattazione chiara e leggibile.
- Non aggiungere link, solo suggerimenti descrittivi.

Alla fine, invita sempre l’utente a chiedere:
“Vuoi che ti suggerisca anche dove mangiare o dormire?”`,
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

const port = process.env.PORT || 10000;
app.listen(port, () => {
  console.log(`✅ Server attivo su porta ${port}`);
});



