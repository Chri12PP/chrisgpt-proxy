import express from "express";
import fetch from "node-fetch";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
console.log("OPENAI_API_KEY:", OPENAI_API_KEY ? "Trovata ✅" : "Mancante ❌");

// ROOT
app.get("/", (req, res) => {
  res.send("✅ ChrisGPT Proxy streaming attivo su Render!");
});

// ================================================
//  TRIPADVISOR PHOTO TEST  (AGGIUNTO PER PROVA)
// ================================================
app.get("/tripadvisor-test", async (req, res) => {
  const query = req.query.q;
  if (!query) return res.json({ error: "Manca parametro q" });

  // ⚠️ INSERISCI QUI LA TUA TRIPADVISOR API KEY (temporanea)
  const TA_KEY = "E6F40662AD7C482CBD83298E1644A53A";

  try {
    // 1️⃣ CERCA LA LOCATION
    const searchUrl =
      "https://api.content.tripadvisor.com/api/v1/location/search?key=" +
      TA_KEY +
      "&searchQuery=" +
      encodeURIComponent(query) +
      "&language=it";

    const searchRes = await fetch(searchUrl);
    const searchData = await searchRes.json();

    if (!searchData.data || !searchData.data.length) {
      return res.json({ error: "Nessun risultato trovato", raw: searchData });
    }

    const locId = searchData.data[0].location_id;

    // 2️⃣ OTTIENI LE FOTO
    const photoUrl =
      "https://api.content.tripadvisor.com/api/v1/location/" +
      locId +
      "/photos?key=" +
      TA_KEY +
      "&language=it";

    const photoRes = await fetch(photoUrl);
    const photoData = await photoRes.json();

    return res.json({
      query,
      location_id: locId,
      photos: photoData
    });
  } catch (err) {
    return res.json({ error: err.toString() });
  }
});

// ================================================
//  STREAMING OPENAI
// ================================================
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

[••• il tuo system prompt completo •••]`
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

// ================================================
//  LISTEN
// ================================================
const port = process.env.PORT || 10000;
app.listen(port, () => {
  console.log(`✅ Server attivo su porta ${port}`);
});
