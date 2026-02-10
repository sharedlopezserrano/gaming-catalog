const KEY = "gc_favorites_v1";

export function getFavorites() {
  try {
    const raw = localStorage.getItem(KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

export function getFavoriteIds() {
  return new Set(getFavorites().map((g) => g.id));
}

export function isFavorite(id) {
  return getFavoriteIds().has(Number(id));
}

export function addFavorite(game) {
  const favs = getFavorites();
  const id = Number(game.id);

  if (favs.some((g) => Number(g.id) === id)) return favs;

  const next = [
    ...favs,
    {
      id,
      name: game.name,
      coverUrl: game.coverUrl || "",
      rating: Number.isFinite(game.rating) ? game.rating : null,
      releaseYear: game.releaseYear || null,
    },
  ];

  localStorage.setItem(KEY, JSON.stringify(next));
  return next;
}

export function removeFavorite(id) {
  const favs = getFavorites();
  const next = favs.filter((g) => Number(g.id) !== Number(id));
  localStorage.setItem(KEY, JSON.stringify(next));
  return next;
}