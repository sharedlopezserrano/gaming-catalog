const BASE = import.meta.env.VITE_API_BASE;

function assertBase() {
  if (!BASE) throw new Error("Missing VITE_API_BASE in .env");
}

export async function searchGames({ q, platform = "", genre = "" }) {
  assertBase();

  const res = await fetch(`${BASE}/api/search`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ q, platform, genre })    
  });

  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.error || `Search failed (${res.status})`);

  return data;
}

export async function getGenres() {
  const res = await fetch(`${BASE}/api/genres`);
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || "Failed to load genres");
  return data;
}

export async function getGame(id) {
  assertBase();

  const res = await fetch(`${BASE}/api/game/${id}`);
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.error || `Details failed (${res.status})`);

  return data;
}

export async function getScreenshots(id) {
  assertBase();

  const res = await fetch(`${BASE}/api/game/${id}/screenshots`);
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.error || `Screenshots failed (${res.status})`);

  return data;
}

export async function getTopRated({ platform = "", genre = "" } = {}) {
  assertBase();
  const params = new URLSearchParams();
  if (platform) params.set("platform", platform);
  if (genre) params.set("genre", genre);

  const res = await fetch(`${BASE}/api/top-rated?${params.toString()}`);
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.error || `Top rated failed (${res.status})`);
  return data;
}

export async function getNewReleases({ platform = "", genre = "" } = {}) {
  assertBase();
  const params = new URLSearchParams();
  if (platform) params.set("platform", platform);
  if (genre) params.set("genre", genre);

  const res = await fetch(`${BASE}/api/new-releases?${params.toString()}`);
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.error || `New releases failed (${res.status})`);
  return data;
}