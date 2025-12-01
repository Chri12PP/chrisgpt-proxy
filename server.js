import express from "express";
import fetch from "node-fetch";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

// 🔥 OpenAI key (Render env var)
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// 🔥 TripAdvisor API key (la tua)
const TA_KEY = "EDE08EAB213348AD94EEA6998E0D4458";

// ===============================
// ROOT
// ===============================
app.get("/", (req, res) => {
  res.send("ChrisGPT Proxy attivo");
});


// ============================================================
//   🔥🔥🔥 ENDPOINT TRIPADVISOR (FUNZIONANTE) 🔥🔥🔥
// ============================================================
app.get("/tripadvisor", async (req, res) => {
  const q = req.query.q;
  if (!q) return res.json({ found: false });

  try {
    // 1️⃣ CERCA LOCATION ID
    const searchUrl =
      "https://api.content.tripadvisor.com/api/v1/location/search?key=" +
      TA_KEY +
      "&searchQuery=" +
      encodeURIComponent(q) +
      "&language=it";

    const sRes = await fetch(searchUrl);
    const sJson = await sRes.json();

    if (!sJson.data || !sJson.data.length) {
      return res.json({ found: false });
    }

    const id = sJson.data[0].location_id;

    // 2️⃣ PRENDI DETTAGLI (foto, rating, review)
    const detUrl =
      "https://api.content.tripadvisor.com/api/v1/location/" +
      id +
      "/details?key=" +
      TA_KEY +
      "&language=it";

    const dRes = await fetch(detUrl);
    const det = await dRes.json();

    return res.json({
      found: true,
      id,
      name: det.name || q,
      photo: det.photo?.images?.large?.url || null,
      rating: det.rating || null,
      reviews: det.num_reviews || null,
      address: det.address_obj || null
    });

  } catch (e) {
    return res.status(500).json({ error: e.toString() });
  }
});


// ============================================================
//  🔥🔥🔥 CHATGPT STREAMING (TUO CODICE PERFETTO) 🔥🔥🔥
// ============================================================
app.post("/api/chat", async (req, res) => {
  const { prompt } = req.body;

  if (!prompt) return res.status(400).json({ reply: "Nessun prompt ricevuto" });
  if (!OPENAI_API_KEY) return res.status(500).json({ reply: "API Key mancante" });

  try {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    const upstream = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "Sei Chris – Travel Planner di Blog di Viaggi" },
          { role: "user", content: prompt }
        ],
        stream: true,
      }),
    });

    const decoder = new TextDecoder();

    for await (const chunk of upstream.body) {
      const text = decoder.decode(chunk);
      res.write(text);
    }

    res.write("data: [DONE]\n\n");
    res.end();

  } catch (e) {
    res.write(`data: ${JSON.stringify({ error: e.toString() })}\n\n`);
    res.end();
  }
});


// ===============================
// RENDER PORT
// ===============================
const port = process.env.PORT || 10000;
app.listen(port, () => {
  console.log("SERVER AVVIATO SU PORTA " + port);
});
