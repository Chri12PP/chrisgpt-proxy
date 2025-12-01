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


// ===============================
// NORMALIZZA QUERY TRIPADVISOR
// ===============================
function cleanQuery(q) {
  return q
    .replace(/italy/gi, "")
    .replace(/italia/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}


// ============================================================
//   🔥🔥🔥 ENDPOINT TRIPADVISOR MIGLIORATO 🔥🔥🔥
// ============================================================
app.get("/tripadvisor", async (req, res) => {
  const raw = req.query.q;
  if (!raw) return res.json({ found: false });

  const q    = cleanQuery(raw);
  const lat  = req.query.lat;
  const lng  = req.query.lng;
  const kind = (req.query.kind || "").toLowerCase();

  // categoria TripAdvisor
  let category = "attractions";
  if (kind === "hotel") category = "hotels";
  else if (kind === "restaurant") category = "restaurants";

  try {
    let searchUrl =
      "https://api.content.tripadvisor.com/api/v1/location/search?key=" +
      TA_KEY +
      "&searchQuery=" +
      encodeURIComponent(q) +
      "&language=it" +
      "&category=" + encodeURIComponent(category);

    // se ho lat/lng → ricerca molto più precisa
    if (lat && lng) {
      searchUrl += "&latLong=" + encodeURIComponent(lat + "," + lng) + "&radius=5&radiusUnit=km";
    }

    // ---- SEARCH ----
    const sRes  = await fetch(searchUrl);
    const sText = await sRes.text();

    let sJson;
    try {
      sJson = JSON.parse(sText);
    } catch (err) {
      return res.status(502).json({
        found: false,
        tried: q,
        error: "Invalid JSON from TripAdvisor (search)",
        raw: sText
      });
    }

    if (!sRes.ok) {
      return res.status(sRes.status).json({
        found: false,
        tried: q,
        error: sJson.Message || "TripAdvisor search error"
      });
    }

    if (!sJson.data || !sJson.data.length) {
      return res.json({ found: false, tried: q });
    }

    // prendiamo il primo ID
    const id = sJson.data[0].location_id;

    // ---- DETAILS ----
    const detUrl =
      "https://api.content.tripadvisor.com/api/v1/location/" +
      id +
      "/details?key=" +
      TA_KEY +
      "&language=it";

    const dRes  = await fetch(detUrl);
    const dText = await dRes.text();

    let det;
    try {
      det = JSON.parse(dText);
    } catch (err) {
      return res.status(502).json({
        found: false,
        tried: q,
        error: "Invalid JSON from TripAdvisor (details)",
        raw: dText
      });
    }

    if (!dRes.ok) {
      return res.status(dRes.status).json({
        found: false,
        tried: q,
        error: det.Message || "TripAdvisor details error"
      });
    }

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
    return res.status(500).json({
      found: false,
      tried: q,
      error: e.toString()
    });
  }
});


// ============================================================
//  🔥🔥🔥 CHATGPT STREAMING
// ============================================================
app.post("/api/chat", async (req, res) => {
  const { prompt } = req.body;

  if (!prompt) return res.status(400).json({ reply: "Nessun prompt ricevuto" });
  if (!OPENAI_API_KEY)
    return res.status(500).json({ reply: "API Key mancante" });

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
