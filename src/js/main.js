import { renderGameCards } from "./modules/ui.js";
import { searchGames } from "./modules/api.js";

const searchForm = document.querySelector("#searchForm");
const searchInput = document.querySelector("#searchInput");
const resultsGrid = document.querySelector("#resultsGrid");
const favoritesGrid = document.querySelector("#favoritesGrid");
const statusText = document.querySelector("#statusText");

// for now, keep favorites empty
renderGameCards(favoritesGrid, []);

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

    const cleanGames = games.map((g) => ({
      id: g.id,
      name: g.name,
      rating: g.rating,
      // IGDB returns urls like //images.igdb.com/...
      coverUrl: g.cover?.url
        ? "https:" + g.cover.url.replace("t_thumb", "t_cover_big")
        : "",
    }));

    renderGameCards(resultsGrid, cleanGames);
    statusText.textContent = `Found ${cleanGames.length} games for "${q}"`;
  } catch (err) {
    console.error(err);
    statusText.textContent = `Error: ${err.message}`;
  }
});