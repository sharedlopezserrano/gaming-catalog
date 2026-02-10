import { renderGameCards } from "./modules/ui.js";

const searchForm = document.querySelector("#searchForm");
const searchInput = document.querySelector("#searchInput");
const resultsGrid = document.querySelector("#resultsGrid");
const statusText = document.querySelector("#statusText");

const demoGames = [
  { id: 1, name: "The Last of Us", rating: 95, coverUrl: "" },
  { id: 2, name: "Hades", rating: 93, coverUrl: "" },
  { id: 3, name: "Elden Ring", rating: 96, coverUrl: "" },
];

renderGameCards(resultsGrid, demoGames);

searchForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const q = searchInput.value.trim();

  if (!q) {
    statusText.textContent = "Type a game name to search.";
    return;
  }

  statusText.textContent = `Searching for: "${q}" (API coming next)`;
});