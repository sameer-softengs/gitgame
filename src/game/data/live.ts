/**
 * live.ts — the vault refreshes: real underrated repos fetched live from the
 * GitHub Search API (no auth needed, 2 requests per run), so the question
 * engine always has fresh material. Falls back to null whenever the API is
 * unreachable or rate-limited — the game never depends on it being up.
 */

export interface LiveRepo {
  owner: string;
  name: string;
  language: string;
  stars: number;
  url: string;
  description: string;
}

export interface LiveLoadout {
  /** Alive: pushed within the last 90 days. */
  fresh: LiveRepo[];
  /** Abandoned: untouched for 2+ years — the Mafia's victims. */
  stale: LiveRepo[];
}

let cached: LiveLoadout | null = null;

/** Pull two slices of GitHub reality: recently-pushed low-star repos and long-abandoned ones. */
export async function fetchLiveLoadout(): Promise<LiveLoadout | null> {
  if (cached) return cached;
  try {
    const day = (n: number) => new Date(Date.now() - n * 86400000).toISOString().slice(0, 10);
    const [fresh, stale] = await Promise.all([
      searchRepos(`stars:3..60 pushed:>${day(90)} has:description`),
      searchRepos(`stars:3..60 pushed:<${day(730)} has:description`),
    ]);
    if (fresh.length < 3 || stale.length < 1) return null;
    cached = { fresh, stale };
    return cached;
  } catch {
    return null; // offline / rate-limited → the caller falls back to the curated vault
  }
}

interface SearchItem {
  full_name: string;
  html_url: string;
  language: string | null;
  stargazers_count: number;
  description: string | null;
}

async function searchRepos(q: string): Promise<LiveRepo[]> {
  // low stars first (order=asc) = the most buried treasure; random page keeps runs fresh
  const page = 1 + ((Math.random() * 2) | 0);
  const url = `https://api.github.com/search/repositories?q=${encodeURIComponent(q)}&sort=stars&order=asc&per_page=50&page=${page}`;
  const res = await fetch(url, {
    headers: { Accept: "application/vnd.github+json" },
    signal: AbortSignal.timeout(9000),
  });
  if (!res.ok) throw new Error(`github search ${res.status}`);
  const data = (await res.json()) as { items?: SearchItem[] };
  return (data.items ?? [])
    .filter((r) => r.language && r.description && r.full_name.includes("/"))
    .map((r) => ({
      owner: r.full_name.split("/")[0],
      name: r.full_name.split("/")[1],
      language: r.language as string,
      stars: r.stargazers_count,
      url: r.html_url,
      description: r.description as string,
    }));
}
