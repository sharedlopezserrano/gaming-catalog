const BASE = "http://localhost:3001";

export async function searchGames(query) {
  const res = await fetch(`${BASE}/api/search`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ q: query }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function getGame(id) {
  const res = await fetch(`${BASE}/api/game/${id}`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function getScreenshots(id) {
  const res = await fetch(`${BASE}/api/game/${id}/screenshots`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}