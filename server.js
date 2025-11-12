import express from "express";
import fetch from "node-fetch";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
console.log("🔍 OPENAI_API_KEY:", OPENAI_API_KEY ? "✅ trovata" : "❌ non trovata");

// ==============================
// ROUTE DI TEST
// ==============================
app.get("/", (req, res) => {
  res.send("✅ ChrisGPT Proxy streaming attivo su Render!");
});

// ==============================
// ROUTE PRINCIPALE /api/chat
// ==============================
app.post("/api/chat", async (req, res) => {
  const { prompt } = req.body;

  if (!prompt) {
    return res.status(400).json({ reply: "⚠️ Nessun prompt ricevuto." });
  }

  if (!OPENAI_API_KEY) {
    return res.status(500).json({ reply: "❌ API key non configurata sul server." });
  }

  // Attiva streaming se richiesto
  const wantsStream =
    String(req.query.stream).toLowerCase() === "true" ||
    (req.headers.accept || "").includes("text/event-stream");

  try {
    if (wantsStream) {
      // ---------- MODE: STREAMING ----------
      console.log("🌊 Modalità streaming attiva");

      res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
      res.setHeader("Cache-Control", "no-cache, no-transform");
      res.setHeader("Connection", "keep-alive");
      res.setHeader("X-Accel-Buffering", "no"); // Disattiva buffering proxy
      res.flushHeaders?.();

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
                "Sei Chris – Travel Planner di Blog di Viaggi. Genera itinerari di viaggio dettagliati in italiano, divisi per giorno, con consigli su cosa vedere, dove mangiare e dove dormire.",
            },
            { role: "user", content: prompt },
          ],
          temperature: 0.8,
          stream: true, // ✅ Streaming attivo
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
      try {
        for await (const chunk of upstream.body) {
          const piece = decoder.decode(chunk, { stream: true });
          res.write(piece);
        }
      } catch (e) {
        console.error("⚠️ Stream interrotto:", e);
      } finally {
        res.write("data: [DONE]\n\n");
        res.end();
      }
      return;
    }

    // ---------- MODE: NON-STREAM (Compatibile con frontend esistente) ----------
    console.log("💬 Modalità classica attiva");

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            ro


