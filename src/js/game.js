import { getGame, getScreenshots } from "./modules/api.js";

const titleEl = document.querySelector("#gameTitle");
const metaEl = document.querySelector("#gameMeta");
const coverEl = document.querySelector("#gameCover");
const summaryEl = document.querySelector("#gameSummary");
const genresEl = document.querySelector("#gameGenres");
const platformsEl = document.querySelector("#gamePlatforms");
const shotsEl = document.querySelector("#screenshots");
const statusEl = document.querySelector("#gameStatus");

function yearFromUnix(unix) {
  if (!unix) return "—";
  return new Date(unix * 1000).getFullYear();
}

function igdbImg(url, size = "t_cover_big") {
  if (!url) return "";
  return ("https:" + url).replace("t_thumb", size);
}

async function load() {
  const params = new URLSearchParams(window.location.search);
  const id = params.get("id");

  if (!id) {
    statusEl.textContent = "Missing game id.";
    return;
  }

  try {
    statusEl.textContent = "Loading game info...";

    const [game, shots] = await Promise.all([
      getGame(id),
      getScreenshots(id),
    ]);

    if (!game) {
      statusEl.textContent = "Game not found.";
      return;
    }

    // --- Render ---
    titleEl.textContent = game.name || "Untitled";
    const releaseYear = yearFromUnix(game.first_release_date);
    const rating = Number.isFinite(game.rating) ? game.rating.toFixed(1) : "N/A";

    metaEl.innerHTML = `
      <span class="pill">⭐ ${rating}</span>
      <span class="pill">📅 ${releaseYear}</span>
    `;

    const coverUrl = igdbImg(game.cover?.url, "t_cover_big");
    coverEl.innerHTML = coverUrl
      ? `<img class="detail-cover" src="${coverUrl}" alt="${escapeHtml(game.name)} cover">`
      : `<div class="detail-cover placeholder">No cover</div>`;

    summaryEl.textContent = game.summary || "No summary available.";

    const genres = (game.genres || []).map((g) => g.name).filter(Boolean);
    genresEl.textContent = genres.length ? genres.join(", ") : "—";

    const platforms = (game.platforms || []).map((p) => p.name).filter(Boolean);
    platformsEl.textContent = platforms.length ? platforms.join(", ") : "—";

    const shotImgs = (shots || [])
      .map((s) => igdbImg(s.url, "t_screenshot_big"))
      .filter(Boolean);

    shotsEl.innerHTML = shotImgs.length
      ? shotImgs.map((u) => `<img class="shot" src="${u}" alt="Screenshot">`).join("")
      : `<div class="pill">No screenshots found.</div>`;

    statusEl.textContent = "";
  } catch (e) {
    console.error(e);
    statusEl.textContent = `Error: ${e.message}`;
  }
}

function escapeHtml(str = "") {
  return str
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

load();