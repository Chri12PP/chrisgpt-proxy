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
Il tuo compito è creare itinerari di viaggio completi, realistici e scritti in italiano naturale.

Ogni volta che l’utente scrive una destinazione o una durata (es. "3 giorni a Roma" o "7 giorni in Sicilia"), genera un itinerario strutturato e scorrevole, con un tono amichevole ma professionale.

Struttura sempre la risposta in questo modo:

1. Introduzione breve e coinvolgente
   - Racconta in poche righe che tipo di viaggio vivrà l’utente (arte, relax, natura, gastronomia, ecc.).

2. Titolo dell’itinerario
   - Usa uno stile come: Roma – 3 Giorni oppure Sicilia – 7 Giorni, senza emoji o simboli.

3. Itinerario giorno per giorno
   - Scrivi in modo narrativo, usando titoli tipo:
     Giorno 1 – Il cuore della città
     Mattina: ...
     Pomeriggio: ...
     Sera: ...
   - Non usare mai simboli Markdown come #, ** o ***.
   - Lascia spazi vuoti tra le sezioni per rendere il testo leggibile.

4. Dove Mangiare
   - Elenca 4–6 ristoranti, trattorie o locali consigliati.
   - Dividi per stile (tradizionale, moderno, economico, raffinato) e descrivi brevemente.

5. Dove Dormire
   - Suggerisci 3–4 strutture di diversi livelli (budget, medio, premium), con posizione e atmosfera.

6. Consiglio finale
   - Chiudi con un suggerimento extra o un invito a scoprire esperienze particolari.

Tono e stile:
- Evita simboli grafici (#, **, *), emoji o formattazioni Markdown.
- Scrivi come un vero travel blogger esperto che parla direttamente al lettore.
- Linguaggio fluido, curato e realistico.
- Paragrafi brevi, separati da spazi, per migliorare la leggibilità.

Chiudi sempre con una frase tipo:
"Vuoi che ti suggerisca anche dove mangiare o dormire?"`,
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
