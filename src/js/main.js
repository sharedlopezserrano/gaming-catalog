import { renderGameCards } from "./modules/ui.js";
import { searchGames } from "./modules/api.js";
import { getFavorites, getFavoriteIds, addFavorite, removeFavorite } from "./modules/storage.js";

const searchForm = document.querySelector("#searchForm");
const searchInput = document.querySelector("#searchInput");
const resultsGrid = document.querySelector("#resultsGrid");
const favoritesGrid = document.querySelector("#favoritesGrid");
const statusText = document.querySelector("#statusText");
const sortSelect = document.querySelector("#sortSelect");
const platformSelect = document.querySelector("#platformSelect");

let lastResults = [];

function unixToYear(unix) {
  if (!unix) return null;
  return new Date(unix * 1000).getFullYear();
}

function toCoverBig(url) {
  if (!url) return "";
  return ("https:" + url).replace("t_thumb", "t_cover_big");
}

function refreshFavoritesUI() {
  const favs = getFavorites();
  const favIds = getFavoriteIds();
  renderGameCards(favoritesGrid, favs, favIds);
}

function refreshResultsUI() {
  const favIds = getFavoriteIds();
  renderGameCards(resultsGrid, lastResults, favIds);
}

refreshFavoritesUI();

searchForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const q = searchInput.value.trim();
  if (!q) {
    statusText.textContent = "Type a game name to search.";
    return;
  }

  statusText.textContent = "Loading...";
  resultsGrid.innerHTML = "";

  try {
    const games = await searchGames(q);

    lastResults = games.map((g) => ({
      id: g.id,
      name: g.name,
      rating: g.rating,
      releaseYear: unixToYear(g.first_release_date),
      coverUrl: g.cover?.url ? toCoverBig(g.cover.url) : "",
    }));

    refreshResultsUI();
    statusText.textContent = `Found ${lastResults.length} games for "${q}"`;
  } catch (err) {
    console.error(err);
    statusText.textContent = `Error: ${err.message}`;
  }
});

function onFavClick(e) {
  const btn = e.target.closest("button[data-action]");
  if (!btn) return;

  e.preventDefault();
  e.stopPropagation();

  const action = btn.dataset.action;
  const id = Number(btn.dataset.id);

  btn.classList.remove("pop");
  void btn.offsetWidth;
  btn.classList.add("pop");

  if (action === "fav") {
    const fromResults = lastResults.find((g) => Number(g.id) === id);
    const fromFavs = getFavorites().find((g) => Number(g.id) === id);
    const game = fromResults || fromFavs;

    if (game) addFavorite(game);
  } else if (action === "unfav") {
    removeFavorite(id);
  }

  refreshFavoritesUI();
  refreshResultsUI();
}

resultsGrid.addEventListener("click", onFavClick);
favoritesGrid.addEventListener("click", onFavClick);

searchInput.addEventListener("input", () => {
  if (searchInput.value.trim() === "") statusText.textContent = "Ready to search…";
});