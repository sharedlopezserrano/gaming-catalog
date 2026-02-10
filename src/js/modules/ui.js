export function renderGameCards(containerEl, games) {
  containerEl.innerHTML = "";

  if (!games || games.length === 0) {
    containerEl.innerHTML = `<div class="pill">No games found.</div>`;
    return;
  }
  const base = import.meta.env.BASE_URL;

  const cards = games.map((g) => {
    const ratingText = Number.isFinite(g.rating) ? `${Math.round(g.rating)}` : "N/A";

    return `
      <a class="card" href="${base}src/pages/game.html?id=${encodeURIComponent(g.id)}">
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
            <span class="pill">ID ${g.id}</span>
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