/**
 * questions.ts — the procedural question engine. NO hardcoded questions:
 * every challenge is generated from a repo pool (live GitHub data merged over
 * the curated vault), and every wrong answer is derived from other repos in
 * the pool or distractor tables.
 *
 * Reliability chain: any kind that can't be supported by the current pool
 * returns null, and the caller falls through to the next kind in its plan —
 * so the game keeps working offline, rate-limited, or with a tiny pool.
 *
 * Flexibility: add a new QuestionKind by adding a case to buildQuestion and
 * listing it in the difficulty variants — everything else adapts automatically.
 */

import type { ChallengeRepo, ChallengeView, Difficulty, QuestionKind, RepoInfo } from "./repos";
import { REPOS, shuffleOptions } from "./repos";
import type { LiveLoadout, LiveRepo } from "./live";

export type { QuestionKind };

// ——— pool: the flexible material the engine draws from ———

export interface RepoPool {
  repos: ChallengeRepo[];
  /** Actively maintained repos (safe bets for "maintained" questions). */
  alive: ChallengeRepo[];
  /** Abandoned/archived repos (the wrong side of "maintained" questions). */
  dead: ChallengeRepo[];
  /** Successor pairs — curated repos that resurrect a dead one (eza→exa). */
  pairs: Array<{ alive: ChallengeRepo; dead: ChallengeRepo }>;
}

const LANGS = ["Rust", "Go", "Python", "JavaScript", "TypeScript", "C", "C++", "Shell", "Java", "Ruby", "Zig", "Lua"];

/** Curated vault always available; live repos are merged on top when present. */
export function makeRepoPool(live: LiveLoadout | null): RepoPool {
  const repos: ChallengeRepo[] = REPOS.map((r) => ({ ...r }));
  const alive = repos.filter((r) => r.tier !== "buried");
  const dead = repos.filter((r) => r.tier === "buried");
  const pairs: Array<{ alive: ChallengeRepo; dead: ChallengeRepo }> = [];

  for (const a of alive) {
    const succ = (a as RepoInfo).successorOf;
    const d = succ ? dead.find((x) => x.name === succ) : undefined;
    if (d) pairs.push({ alive: a, dead: d });
  }
  if (live) {
    for (const r of live.fresh) {
      const c = liveToChallengeRepo(r);
      repos.push(c);
      alive.push(c);
    }
    for (const r of live.stale) {
      const c = liveToChallengeRepo(r);
      repos.push(c);
      dead.push(c);
    }
  }
  return { repos, alive, dead, pairs };
}

function liveToChallengeRepo(r: LiveRepo): ChallengeRepo {
  return {
    owner: r.owner,
    name: r.name,
    language: r.language,
    url: r.url,
    tier: r.stars < 10 ? "buried" : r.stars < 50 ? "hidden gem" : "rising",
    blurb: r.description,
    how: "Fetched live from the GitHub Search API seconds ago — a real repository, breathing right now.",
    why: `Only ${r.stars} stars while being this useful — the definition of underrated. Your visit and star are real hype.`,
    stars: r.stars,
  };
}

// ——— generation ———

const key = (r: ChallengeRepo) => `${r.owner}/${r.name}`;

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = (Math.random() * (i + 1)) | 0;
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
const pick = <T,>(arr: T[]): T => arr[(Math.random() * arr.length) | 0];

/** Pick a repo matching ok(), preferring ones this run hasn't used yet. */
function pickRepo(candidates: ChallengeRepo[], used: Set<string>, ok: (r: ChallengeRepo) => boolean): ChallengeRepo | null {
  const valid = candidates.filter(ok);
  if (!valid.length) return null;
  const fresh = valid.filter((r) => !used.has(key(r)));
  return pick(fresh.length ? fresh : valid);
}

/**
 * Build one question from the pool. Returns null when the pool can't support
 * the kind — the caller falls through to its next preferred kind.
 * `used` is mutated: the chosen repo is marked so runs avoid repetition.
 */
export function buildQuestion(pool: RepoPool, kind: QuestionKind, level: Difficulty, used: Set<string>): ChallengeView | null {
  switch (kind) {
    case "language": {
      const repo = pickRepo(pool.repos, used, (r) => !!r.language);
      if (!repo) return null;
      const distractors = shuffle(LANGS.filter((l) => l !== repo.language)).slice(0, 3);
      const s = shuffleOptions([repo.language, ...distractors], 0);
      return {
        type: "language",
        level,
        prompt: `Which language powers ${repo.owner}/${repo.name}?`,
        repo,
        options: s.options,
        correctIndex: s.correctIndex,
        hint: repo.blurb,
      };
    }
    case "purpose": {
      const repo = pickRepo(pool.repos, used, (r) => !!r.blurb);
      // wrong answers are OTHER repos' blurbs — generated, never hard-coded
      const others = shuffle(pool.repos.filter((r) => key(r) !== key(repo!) && r.blurb !== repo!.blurb)).slice(0, 3);
      if (!repo || others.length < 3) return null;
      const s = shuffleOptions([repo.blurb, ...others.map((o) => o.blurb)], 0);
      return {
        type: "purpose",
        level,
        prompt: `${repo.owner}/${repo.name} — what does it actually do?`,
        repo,
        options: s.options,
        correctIndex: s.correctIndex,
        hint: "Match the repo to its true purpose — the other scrolls describe different tools.",
      };
    }
    case "maintained": {
      const pair = pool.pairs.length
        ? pick(pool.pairs)
        : pool.alive.length && pool.dead.length
          ? { alive: pick(pool.alive), dead: pick(pool.dead) }
          : null;
      if (!pair) return null;
      const s = shuffleOptions([key(pair.alive), key(pair.dead)], 0);
      return {
        type: "maintained",
        level,
        prompt: "Only ONE of these repos is still alive. The other hasn't been pushed in years — pick the safe bet:",
        repo: pair.alive,
        repoB: { owner: pair.dead.owner, name: pair.dead.name },
        options: s.options,
        correctIndex: s.correctIndex,
        hint: "pushed_at is the heartbeat — check the last push before trusting a repo.",
      };
    }
    case "stars": {
      const repo = pickRepo(pool.repos, used, (r) => r.stars !== undefined && r.stars > 0);
      if (!repo) return null;
      const real = repo.stars as number;
      const s = shuffleOptions([real, real * 7 + 3, real * 40 + 11, real * 150 + 50].map(String), 0);
      return {
        type: "stars",
        level,
        prompt: `THE LEDGER: how many stars does ${repo.owner}/${repo.name} actually have?`,
        repo,
        options: s.options,
        correctIndex: s.correctIndex,
        hint: "Most genuinely useful repos live far below 100 stars — hype is a terrible metric.",
      };
    }
  }
}

// ——— run plan: escalating difficulty across the shrines ———

/** Difficulty curve: first ~40% easy, middle ~40% medium, the rest is the Mafia's. */
export function levelFor(i: number, total: number): Difficulty {
  const t = i / total;
  return t < 0.375 ? "easy" : t < 0.75 ? "medium" : "hard";
}

/** Per-shrine preferred kinds (first that works wins — that's the fallback chain). */
export function buildRunPlan(total: number): QuestionKind[][] {
  const VARIANTS: Record<Difficulty, QuestionKind[][]> = {
    easy: [["language"], ["purpose"], ["language", "purpose"]],
    medium: [["purpose", "language"], ["maintained", "purpose"], ["language", "purpose", "maintained"]],
    hard: [["stars", "maintained"], ["maintained", "stars"], ["stars", "language", "maintained"]],
  };
  return Array.from({ length: total }, (_, i) => pick(VARIANTS[levelFor(i, total)]));
}
