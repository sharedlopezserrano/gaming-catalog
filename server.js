import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const clientId = process.env.TWITCH_CLIENT_ID;
const clientSecret = process.env.TWITCH_CLIENT_SECRET;

if (!clientId || !clientSecret) {
  console.warn("Missing TWITCH_CLIENT_ID or TWITCH_CLIENT_SECRET in .env");
}

let cachedToken = null;
let tokenExpiresAt = 0;

async function getToken() {
  const now = Date.now();
  if (cachedToken && now < tokenExpiresAt) return cachedToken;

  const url =
    `https://id.twitch.tv/oauth2/token` +
    `?client_id=${clientId}` +
    `&client_secret=${clientSecret}` +
    `&grant_type=client_credentials`;

  const res = await fetch(url, { method: "POST" });
  if (!res.ok) throw new Error(`Token error ${res.status}: ${await res.text()}`);
  const data = await res.json();

  cachedToken = data.access_token;
  // refresh a little early
  tokenExpiresAt = Date.now() + (data.expires_in * 1000) - 60_000;
  return cachedToken;
}

async function igdb(endpoint, body) {
  const token = await getToken();
  const res = await fetch(`https://api.igdb.com/v4/${endpoint}`, {
    method: "POST",
    headers: {
      "Client-ID": clientId,
      Authorization: `Bearer ${token}`,
      "Content-Type": "text/plain",
    },
    body,
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`IGDB ${endpoint} error ${res.status}: ${txt}`);
  }
  return res.json();
}

app.get("/", (req, res) => {
  res.send("IGDB Proxy is running  Use /api/search, /api/game/:id, /api/game/:id/screenshots");
});

app.post("/api/search", async (req, res) => {
  try {
    const q = String(req.body.q || "").trim();
    if (!q) return res.status(400).json({ error: "Missing q" });

    const data = await igdb(
      "games",
      `
      search "${q.replaceAll('"', '\\"')}";
      fields id,name,rating,first_release_date,cover.url,genres.name,platforms.name;
      where category = 0;
      limit 24;
    `
    );

    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/game/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ error: "Bad id" });

    const data = await igdb(
      "games",
      `
      where id = ${id};
      fields id,name,summary,rating,first_release_date,cover.url,genres.name,platforms.name,involved_companies.company.name;
      limit 1;
    `
    );

    res.json(data[0] || null);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/game/:id/screenshots", async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ error: "Bad id" });

    const data = await igdb(
      "screenshots",
      `
      fields url;
      where game = ${id};
      limit 10;
    `
    );

    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/token-test", async (req, res) => {
  try {
    const url =
      `https://id.twitch.tv/oauth2/token` +
      `?client_id=${process.env.TWITCH_CLIENT_ID}` +
      `&client_secret=${process.env.TWITCH_CLIENT_SECRET}` +
      `&grant_type=client_credentials`;

    const r = await fetch(url, { method: "POST" });
    const text = await r.text();
    res.status(r.status).send(text);
  } catch (e) {
    res.status(500).send(String(e.message || e));
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`IGDB proxy running on http://localhost:${PORT}`));
