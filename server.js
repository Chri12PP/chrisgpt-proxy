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
    res.setHeader





