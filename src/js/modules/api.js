const BASE = import.meta.env.VITE_API_BASE;

function assertBase() {
  if (!BASE) throw new Error("Missing VITE_API_BASE in .env");
}

export async function searchGames({ q, sort = "", platform = "" }) {
  assertBase();

  const res = await fetch(`${BASE}/api/search`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ q, sort, platform }),
  });

  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.error || `Search failed (${res.status})`);

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