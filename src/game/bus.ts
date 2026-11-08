/**
 * bus.ts — tiny typed event bus bridging the Phaser world and the React HUD.
 * The game emits; the overlay renders. Both live in the same page, so a simple
 * emitter keeps the loop decoupled from React re-renders.
 */

export interface HudState {
  score: number;
  hp: number;
  gems: number;
  gemsTotal: number;
  found: number;
  total: number;
  streak: number;
  multiplier: number;
}

export interface RunSummary {
  score: number;
  found: number;
  total: number;
  gems: number;
  gemsTotal: number;
  bestStreak: number;
  bugHits: number;
  badges: string[];
  newBest: boolean;
  discovered: Array<{ owner: string; name: string; url: string; tier: string }>;
}

export type ScreenState = "title" | "playing" | "paused" | "gameover" | "victory";

type Events = {
  /** First rendered frame — verify-game.mjs waits on the window flag, React uses this. */
  ready: void;
  screen: ScreenState;
  hud: HudState;
  challenge: import("./data/repos").ChallengeView;
  /** Shown after answering: celebration or correction, then the run resumes. */
  challengeResult: { correct: boolean; fact: string; url: string; repoName: string };
  gameover: RunSummary;
  victory: RunSummary;
  toast: { text: string; kind: "badge" | "info" | "danger" };
  profile: { handle: string; githubLogin: string | null };
  /** GitHub device-flow progress (only fires when a client id is configured). */
  githubDevice: { verificationUri: string; userCode: string; status: "pending" | "done" | "error"; message?: string };
};

type Handler<T> = (payload: T) => void;

class Bus {
  private map = new Map<keyof Events, Set<Handler<never>>>();

  on<K extends keyof Events>(key: K, fn: Handler<Events[K]>): () => void {
    let set = this.map.get(key);
    if (!set) this.map.set(key, (set = new Set()));
    set.add(fn as Handler<never>);
    return () => set!.delete(fn as Handler<never>);
  }
  emit<K extends keyof Events>(key: K, payload: Events[K]): void {
    this.map.get(key)?.forEach((fn) => (fn as Handler<Events[K]>)(payload));
  }
}

export const bus = new Bus();
