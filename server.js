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
  if (!res.ok) throw new Error(`Token error ${res.status}: ${text}`);

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
  if (!res.ok) throw new Error(`IGDB ${endpoint} error ${res.status}: ${text}`);
  return JSON.parse(text);
}

function escSearch(s) {
  return String(s).replaceAll('"', '\\"');
}

function buildFilterWhere({ platform = 0, genre = 0 } = {}) {
  const parts = [];
  if (platform) parts.push(`platforms = (${platform})`);
  if (genre) parts.push(`genres = (${genre})`);
  return parts;
}

async function firstNonEmpty(queries) {
  for (const q of queries) {
    const data = await igdb("games", q);
    if (Array.isArray(data) && data.length > 0) return data;
  }
  return [];
}

app.get("/", (req, res) => {
  res.send(
    "IGDB Proxy is running ✅ Endpoints: POST /api/search, GET /api/top-rated, GET /api/new-releases, GET /api/random, GET /api/genres, GET /api/game/:id, GET /api/game/:id/screenshots"
  );
});

// Optional GET search
app.get("/api/search", async (req, res) => {
  try {
    const q = String(req.query.q || "").trim();
    if (!q) return res.status(400).json({ error: "Missing q" });

    const data = await igdb(
      "games",
      `
      search "${escSearch(q)}";
      fields id,name,summary,rating,total_rating,first_release_date,cover.url,genres.name,platforms.name;
      limit 24;
    `
    );

    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Main POST search
app.post("/api/search", async (req, res) => {
  try {
    const q = String(req.body.q || "").trim();
    const platform = Number(req.body.platform || 0);
    const genre = Number(req.body.genre || 0);

    if (!q) return res.status(400).json({ error: "Missing q" });

    const filterParts = buildFilterWhere({ platform, genre });
    const whereClause = filterParts.length ? `where ${filterParts.join(" & ")};` : "";

    const data = await igdb(
      "games",
      `
      search "${escSearch(q)}";
      fields id,name,summary,rating,total_rating,first_release_date,cover.url,genres.name,platforms.name;
      ${whereClause}
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
      fields id,name,summary,rating,total_rating,first_release_date,cover.url,genres.name,platforms.name,involved_companies.company.name;
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

// Genres
app.get("/api/genres", async (req, res) => {
  try {
    const data = await igdb(
      "genres",
      `
      fields id,name;
      sort name asc;
      limit 200;
    `
    );
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/top-rated", async (req, res) => {
  try {
    res.set("Cache-Control", "no-store");

    const platform = Number(req.query.platform || 0);
    const genre = Number(req.query.genre || 0);

    const extra = [];
    if (platform) extra.push(`platforms = (${platform})`);
    if (genre) extra.push(`genres = (${genre})`);

    const fields = `
      fields id,name,summary,total_rating,total_rating_count,rating,rating_count,
      first_release_date,cover.url,genres.name,platforms.name;
    `;

    let data = await igdb(
      "games",
      `
      ${fields}
      where total_rating != null & first_release_date > 0 ${extra.length ? `& ${extra.join(" & ")}` : ""};
      sort total_rating desc;
      limit 24;
    `
    );

    if (!Array.isArray(data) || data.length === 0) {
      data = await igdb(
        "games",
        `
        ${fields}
        where rating != null & first_release_date > 0 ${extra.length ? `& ${extra.join(" & ")}` : ""};
        sort rating desc;
        limit 24;
      `
      );
    }

    
    if (!Array.isArray(data) || data.length === 0) {
      data = await igdb(
        "games",
        `
        ${fields}
        where total_rating != null & first_release_date > 0;
        sort total_rating desc;
        limit 24;
      `
      );
    }

    res.json(Array.isArray(data) ? data : []);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});


// New Releases
app.get("/api/new-releases", async (req, res) => {
  try {
    res.set("Cache-Control", "no-store");

    const platform = Number(req.query.platform || 0);
    const genre = Number(req.query.genre || 0);
    const now = Math.floor(Date.now() / 1000);

    const extra = [];
    if (platform) extra.push(`platforms = (${platform})`);
    if (genre) extra.push(`genres = (${genre})`);

    const fields = `
      fields id,name,summary,total_rating,total_rating_count,rating,rating_count,
      first_release_date,cover.url,genres.name,platforms.name;
    `;

    let data = await igdb(
      "games",
      `
      ${fields}
      where first_release_date > 0 & first_release_date <= ${now}
      ${extra.length ? `& ${extra.join(" & ")}` : ""};
      sort first_release_date desc;
      limit 24;
    `
    );

    if (!Array.isArray(data) || data.length === 0) {
      data = await igdb(
        "games",
        `
        ${fields}
        where first_release_date > 0 & first_release_date <= ${now};
        sort first_release_date desc;
        limit 24;
      `
      );
    }

    res.json(Array.isArray(data) ? data : []);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Random / Featured
app.get("/api/random", async (req, res) => {
  try {
    res.set("Cache-Control", "no-store");

    const platform = Number(req.query.platform || 0);
    const genre = Number(req.query.genre || 0);
    const now = Math.floor(Date.now() / 1000);

    const extra = [];
    if (platform) extra.push(`platforms = (${platform})`);
    if (genre) extra.push(`genres = (${genre})`);

    const fields = `
      fields id,name,summary,total_rating,total_rating_count,rating,rating_count,
      first_release_date,cover.url,genres.name,platforms.name;
    `;

    const offset = Math.floor(Math.random() * 200);

    let data = await igdb(
      "games",
      `
      ${fields}
      where first_release_date > 0 & first_release_date <= ${now}
      ${extra.length ? `& ${extra.join(" & ")}` : ""};
      sort first_release_date desc;
      offset ${offset};
      limit 24;
    `
    );

    if (!Array.isArray(data) || data.length === 0) {
      data = await igdb(
        "games",
        `
        ${fields}
        where first_release_date > 0 & first_release_date <= ${now};
        sort first_release_date desc;
        offset ${offset};
        limit 24;
      `
      );
    }

    res.json(Array.isArray(data) ? data : []);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`IGDB proxy running on port ${PORT}`));