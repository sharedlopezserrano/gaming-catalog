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
  console.warn("Missing TWITCH_CLIENT_ID or TWITCH_CLIENT_SECRET in Render env vars.");
}

// --- Token cache ---
let cachedToken = null;
let tokenExpiresAt = 0;

async function getToken() {
  const now = Date.now();
  if (cachedToken && now < tokenExpiresAt) return cachedToken;

  const url =
    `https://id.twitch.tv/oauth2/token` +
    `?client_id=${encodeURIComponent(clientId)}` +
    `&client_secret=${encodeURIComponent(clientSecret)}` +
    `&grant_type=client_credentials`;

  const res = await fetch(url, { method: "POST" });
  const text = await res.text();

  if (!res.ok) {
    throw new Error(`Token error ${res.status}: ${text}`);
  }

  const data = JSON.parse(text);
  cachedToken = data.access_token;
  tokenExpiresAt = Date.now() + data.expires_in * 1000 - 60_000;

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

  const text = await res.text();

  if (!res.ok) {
    throw new Error(`IGDB ${endpoint} error ${res.status}: ${text}`);
  }

  return JSON.parse(text);
}

// --- Root ---
app.get("/", (req, res) => {
  res.send(
    "IGDB Proxy is running ✅ Endpoints: POST /api/search, GET /api/game/:id, GET /api/game/:id/screenshots"
  );
});

app.get("/api/search", async (req, res) => {
  try {
    const q = String(req.query.q || "").trim();
    if (!q) return res.status(400).json({ error: "Missing q" });

    const data = await igdb(
      "games",
      `
      search "${q.replaceAll('"', '\\"')}";
      fields id,name,summary,rating,first_release_date,cover.url,genres.name,platforms.name;
      limit 24;
    `
    );

    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Main endpoint your frontend uses
app.post("/api/search", async (req, res) => {
  try {
    const q = String(req.body.q || "").trim();
    const sort = String(req.body.sort || "").trim(); // "-rating", "-first_release_date", "name"
    const platform = Number(req.body.platform || 0); // 6, 48, 49, 130...

    if (!q) return res.status(400).json({ error: "Missing q" });

    const whereParts = [];
    if (platform) whereParts.push(`platforms = (${platform})`);

    const whereClause = whereParts.length ? `where ${whereParts.join(" & ")};` : "";
    const sortClause = sort ? `sort ${sort};` : "";

    const data = await igdb(
      "games",
      `
      search "${q.replaceAll('"', '\\"')}";
      fields id,name,summary,rating,first_release_date,cover.url,genres.name,platforms.name;
      ${whereClause}
      ${sortClause}
      limit 24;
    `
    );

    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Game details
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

// Screenshots
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

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`IGDB proxy running on port ${PORT}`));