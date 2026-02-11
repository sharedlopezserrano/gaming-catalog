import { renderGameCards } from "./modules/ui.js";
import { searchGames, getGenres, getTopRated, getNewReleases, getRandomGames } from "./modules/api.js";
import { getFavorites, getFavoriteIds, addFavorite, removeFavorite } from "./modules/storage.js";

const searchForm = document.querySelector("#searchForm");
const searchInput = document.querySelector("#searchInput");
const resultsGrid = document.querySelector("#resultsGrid");
const favoritesGrid = document.querySelector("#favoritesGrid");
const statusText = document.querySelector("#statusText");

const sortSelect = document.querySelector("#sortSelect");
const platformSelect = document.querySelector("#platformSelect");
const genreSelect = document.querySelector("#genreSelect");

const navLinks = document.querySelectorAll(".nav-link");
const homeSection = document.querySelector("#homeSection");
const favoritesTitle = document.querySelector("#favoritesSectionTitle");
const resultsTitle = document.querySelector("#resultsTitle");
const resultsSection = document.querySelector("#resultsSection");
const homeIntro = document.querySelector("#homeIntro");

let lastResults = [];
let currentView = "home";

function unixToYear(unix) {
  if (!unix) return null;
  return new Date(unix * 1000).getFullYear();
}

function pickRating(g) {
  const tr = Number(g?.total_rating);
  const r = Number(g?.rating);

  if (Number.isFinite(tr) && tr > 0) return tr;
  if (Number.isFinite(r) && r > 0) return r;
  return null;
}

function toCoverBig(url) {
  if (!url) return "";
  return ("https:" + url).replace("t_thumb", "t_cover_big");
}

function applySort(sortValue) {
  if (sortValue === "-rating") {
    lastResults.sort((a, b) => (b.rating ?? -1) - (a.rating ?? -1));
  } else if (sortValue === "-first_release_date") {
    lastResults.sort((a, b) => (b.releaseYear ?? 0) - (a.releaseYear ?? 0));
  } else if (sortValue === "name") {
    lastResults.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  }
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

/* ---------------- Genres (popular only) ---------------- */
const POPULAR_GENRES = new Set([
  "Action",
  "Adventure",
  "Role-playing (RPG)",
  "Shooter",
  "Strategy",
  "Sports",
  "Racing",
  "Platform",
  "Puzzle",
  "Fighting",
  "Simulator",
  "Indie",
  "Arcade",
]);

async function loadGenres() {
  try {
    const allGenres = await getGenres();
    const popular = allGenres.filter((g) => POPULAR_GENRES.has(g.name));

    genreSelect.innerHTML =
      `<option value="">All</option>` +
      popular.map((g) => `<option value="${g.id}">${g.name}</option>`).join("");
  } catch (err) {
    console.error(err);
  }
}

loadGenres();
showHomeView();
loadHomeRandom();

/* ---------------- Search (Home) ---------------- */
searchForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  currentView = "home";

  const q = searchInput.value.trim();
  if (!q) {
    statusText.textContent = "Type a game name to search.";
    return;
  }

  statusText.textContent = "Loading...";
  resultsGrid.innerHTML = "";

  try {
    const platform = platformSelect?.value || "";
    const genre = genreSelect?.value || "";
    const games = await searchGames({ q, platform, genre });

    lastResults = games.map((g) => ({
      id: g.id,
      name: g.name,
      rating: pickRating(g),
      releaseYear: unixToYear(g.first_release_date),
      coverUrl: g.cover?.url ? toCoverBig(g.cover.url) : "",
    }));

    const sort = sortSelect?.value || "";
    applySort(sort);

    refreshResultsUI();
    statusText.textContent = `Found ${lastResults.length} games for "${q}"`;
  } catch (err) {
    console.error(err);
    statusText.textContent = `Error: ${err.message}`;
  }
});

/* ---------------- Favorites click (delegation) ---------------- */
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

/* ---------------- Views / Navbar ---------------- */
function setActiveNav(view) {
  navLinks.forEach((a) => {
    a.classList.toggle("is-active", a.dataset.view === view);
  });
}

function showHomeView() {
  setActiveNav("home");
  statusText.textContent = "";

  homeSection?.classList.remove("hidden");
  resultsSection?.classList.remove("hidden");
  statusText?.classList.remove("hidden");

  favoritesTitle?.classList.remove("hidden");
  favoritesGrid?.classList.remove("hidden");

  homeIntro?.classList.remove("hidden");
}

function showFavoritesView() {
  setActiveNav("favorites");
  statusText.textContent = "";

  homeSection?.classList.add("hidden");
  resultsSection?.classList.add("hidden");
  statusText?.classList.add("hidden");

  favoritesTitle?.classList.remove("hidden");
  favoritesGrid?.classList.remove("hidden");

  favoritesTitle?.scrollIntoView({ behavior: "smooth", block: "start" });
}

async function loadPreset(kind) {
  try {
    homeIntro?.classList.add("hidden");
    setActiveNav(kind === "top" ? "top" : "new");

    // para Top/New no queremos ordenar local por el select
    sortSelect.value = "";

    const platform = platformSelect?.value || "";
    const genre = genreSelect?.value || "";

    statusText.textContent = "Loading...";
    resultsGrid.innerHTML = "";

    let games = [];
    if (kind === "top") {
      games = await getTopRated({ platform, genre });
      resultsTitle.textContent = "Top Rated";
    } else {
      games = await getNewReleases({ platform, genre });
      resultsTitle.textContent = "New Releases";
    }

    lastResults = games.map((g) => ({
      id: g.id,
      name: g.name,
      rating: pickRating(g),
      releaseYear: unixToYear(g.first_release_date),
      coverUrl: g.cover?.url ? toCoverBig(g.cover.url) : "",
    }));

    refreshResultsUI();
    statusText.textContent = `Showing ${lastResults.length} games`;
  } catch (e) {
    console.error(e);
    statusText.textContent = `Error: ${e.message}`;
  }
}

navLinks.forEach((a) => {
  a.addEventListener("click", (e) => {
    e.preventDefault();
    const view = a.dataset.view;

    if (view === "home") {
      currentView = "home";
      showHomeView();
      resultsTitle.textContent = "Featured Games";
      loadHomeRandom();
      return;
    }

    if (view === "favorites") {
      currentView = "favorites";
      showFavoritesView();
      return;
    }

    if (view === "top") {
      currentView = "top";
      showHomeView();
      loadPreset("top");
      return;
    }

    if (view === "new") {
      currentView = "new";
      showHomeView();
      loadPreset("new");
      return;
    }
  });
});

async function loadHomeRandom() {
  try {
    const platform = platformSelect?.value || "";
    const genre = genreSelect?.value || "";

    statusText.textContent = "Loading featured games...";
    resultsGrid.innerHTML = "";

    const games = await getRandomGames({ platform, genre });

    lastResults = games.map((g) => ({
      id: g.id,
      name: g.name,
      rating: pickRating(g),
      releaseYear: unixToYear(g.first_release_date),
      coverUrl: g.cover?.url ? toCoverBig(g.cover.url) : "",
    }));

    resultsTitle.textContent = "Featured Games";
    refreshResultsUI();
    statusText.textContent = `Showing ${lastResults.length} games`;
  } catch (e) {
    console.error(e);
    statusText.textContent = `Error: ${e.message}`;
  }
}

/* ---------------- Controls events ---------------- */
sortSelect?.addEventListener("change", () => {
  if (currentView !== "home") return;
  applySort(sortSelect.value);
  refreshResultsUI();
});

platformSelect?.addEventListener("change", () => {
  if (currentView === "top") return loadPreset("top");
  if (currentView === "new") return loadPreset("new");
  if (currentView === "home") return loadHomeRandom();
});

genreSelect?.addEventListener("change", () => {
  if (currentView === "top") return loadPreset("top");
  if (currentView === "new") return loadPreset("new");
  if (currentView === "home") return loadHomeRandom();
});

searchInput.addEventListener("input", () => {
  if (searchInput.value.trim() === "") statusText.textContent = "Ready to search…";
});