import { describe, it, expect } from "vitest";
import { makeRepoPool, buildQuestion, buildRunPlan, levelFor, type QuestionKind } from "./questions";
import type { LiveLoadout } from "./live";

const fakeLive: LiveLoadout = {
  fresh: [
    { owner: "someone", name: "tinydb", language: "C", stars: 7, url: "#", description: "A pocket key-value store" },
    { owner: "other", name: "wasmx", language: "Zig", stars: 23, url: "#", description: "A wasm runtime in 4k lines" },
    { owner: "third", name: "gogadget", language: "Go", stars: 41, url: "#", description: "A tiny http middleware kit" },
    { owner: "fourth", name: "pyfast", language: "Python", stars: 33, url: "#", description: "Fast python linter hooks" },
  ],
  stale: [
    { owner: "ghost", name: "oldkit", language: "JavaScript", stars: 15, url: "#", description: "Abandoned dom helpers" },
    { owner: "relic", name: "pastjs", language: "CoffeeScript", stars: 9, url: "#", description: "Ancient build chains" },
  ],
};

const KINDS: QuestionKind[] = ["language", "purpose", "maintained", "stars"];

describe("procedural question engine", () => {
  it("never fails while the vault has repos — even fully offline (curated pool)", () => {
    const pool = makeRepoPool(null);
    const used = new Set<string>();
    for (let i = 0; i < 200; i++) {
      const kind = KINDS[i % 3]; // stars needs live data — legitimately skipped offline
      const v = buildQuestion(pool, kind, "easy", used);
      if (kind === "stars") { expect(v).toBeNull(); continue; }
      expect(v).not.toBeNull();
      expect(v!.correctIndex).toBeGreaterThanOrEqual(0);
      expect(v!.correctIndex).toBeLessThan(v!.options.length);
      expect(new Set(v!.options).size).toBe(v!.options.length); // no duplicate options
    }
  });

  it("all four kinds work with live data", () => {
    const pool = makeRepoPool(fakeLive);
    const used = new Set<string>();
    for (const kind of KINDS) {
      const v = buildQuestion(pool, kind, "hard", used);
      expect(v, kind).not.toBeNull();
      used.add(`${v!.repo.owner}/${v!.repo.name}`);
    }
  });

  it("correct answer position varies across builds (never pinned to one state)", () => {
    const pool = makeRepoPool(null);
    const positions = new Set<number>();
    for (let i = 0; i < 100; i++) {
      const v = buildQuestion(pool, "purpose", "easy", new Set());
      positions.add(v!.correctIndex);
    }
    expect(positions.size).toBeGreaterThan(1);
  });

  it("maintained questions always point at the living repo, never the dead one", () => {
    const pool = makeRepoPool(fakeLive);
    for (let i = 0; i < 100; i++) {
      const v = buildQuestion(pool, "maintained", "medium", new Set());
      expect(v!.options[v!.correctIndex]).toBe(`${v!.repo.owner}/${v!.repo.name}`);
    }
  });

  it("stars questions carry the REAL star count (live pool)", () => {
    const pool = makeRepoPool(fakeLive);
    for (let i = 0; i < 50; i++) {
      const v = buildQuestion(pool, "stars", "hard", new Set())!;
      expect(Number(v.options[v.correctIndex])).toBe(v.repo.stars);
    }
  });

  it("run plan escalates: easy → medium → hard, covering every shrine", () => {
    const plan = buildRunPlan(8);
    expect(plan).toHaveLength(8);
    expect(levelFor(0, 8)).toBe("easy");
    expect(levelFor(3, 8)).toBe("medium");
    expect(levelFor(7, 8)).toBe("hard");
    // the mafia level prefers star/ledger questions (live) with maintained fallback
    expect(plan[7].includes("stars") || plan[7].includes("maintained")).toBe(true);
  });

  it("reliability: a starved pool returns null instead of throwing, caller falls through", () => {
    const starved = makeRepoPool(null);
    // starve every array the engine draws from, like a hypothetical tiny custom pool
    starved.repos = starved.repos.slice(0, 2);
    starved.alive = starved.alive.slice(0, 2);
    starved.dead = [];
    starved.pairs = [];
    expect(buildQuestion(starved, "purpose", "easy", new Set())).toBeNull();
    expect(buildQuestion(starved, "maintained", "easy", new Set())).toBeNull();
    expect(buildQuestion(starved, "stars", "easy", new Set())).toBeNull();
    // language still works with 2 repos
    expect(buildQuestion(starved, "language", "easy", new Set())).not.toBeNull();
  });
});
