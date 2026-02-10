export function renderGameCards(containerEl, games, favoriteIds = new Set()) {
  containerEl.innerHTML = "";

  if (!games || games.length === 0) {
    containerEl.innerHTML = `<div class="pill">No games found.</div>`;
    return;
  }

  const base = import.meta.env.BASE_URL;

  const cards = games.map((g) => {
    const ratingText = Number.isFinite(g.rating) ? `${Math.round(g.rating)}` : "N/A";
    const isFav = favoriteIds.has(Number(g.id));

    return `
      <a class="card" href="${base}src/pages/game.html?id=${encodeURIComponent(g.id)}">
        <button
          class="fav-btn ${isFav ? "is-fav" : ""}"
          type="button"
          data-action="${isFav ? "unfav" : "fav"}"
          data-id="${g.id}"
          aria-label="${isFav ? "Remove from favorites" : "Add to favorites"}"
          title="${isFav ? "Remove favorite" : "Add favorite"}"
        >
          ${isFav ? "♥" : "♡"}
        </button>

        <div class="cover">
          ${
            g.coverUrl
              ? `<img class="cover-img" src="${g.coverUrl}" alt="${escapeHtml(g.name)} cover" />`
              : `<span>No cover</span>`
          }
        </div>

        <div class="card-body">
          <div class="card-title">${escapeHtml(g.name)}</div>
          <div class="meta">
            <span class="pill">⭐ ${ratingText}</span>
            <span class="pill">${g.releaseYear ?? "—"}</span>
          </div>
        </div>
      </a>
    `;
  });

  containerEl.innerHTML = cards.join("");
}

function escapeHtml(str = "") {
  return str
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}