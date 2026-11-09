/**
 * DungeonScene.ts — the run itself: explore the vault, collect gem sparkles,
 * answer shrine challenges about underrated repos, dodge the bugs.
 *
 * Movement + collisions are done by hand against the tile grid (no arcade
 * physics): the dungeon is small, deterministic and axis-blocked, which keeps
 * the sim predictable and the self-check reproducible.
 *
 * Contract with scripts/verify-game.mjs:
 *   window.__GAME_READY__ = true on create (first frame renders same tick)
 *   window.__gameProbe()  → {x, y, z} where z mirrors y, so "W moves forward"
 *   means y decreasing (up) and "D moves right" means x increasing.
 *   Space starts the run from the title screen; Escape pauses.
 */

import Phaser from "phaser";
import {
  buildDungeon,
  validateDungeon,
  TILE,
  MAP_W,
  MAP_H,
  SHRINE_TILES,
  GEM_TILES,
  BUG_PATROLS,
  PLAYER_START,
} from "../data/dungeon";
import {
  SHRINE_CHALLENGES,
  buildChallenge,
  TIER_SCORE,
  type ChallengeView,
} from "../data/repos";
import { bus, type HudState, type RunSummary } from "../bus";
import { highScore } from "../storage";
import type { AudioSystem } from "../audio";

const PLAYER_SPEED = 150; // px/s
const HITBOX = 7;         // half-size of the player collision box, px
const PICKUP_DIST = 16;   // gem collection radius
const SHRINE_DIST = 26;   // challenge trigger radius
const BUG_DIST = 13;      // bug hurt radius
const IFRAMES_MS = 1400;  // invulnerability after a bug hit
const MAX_HP = 3;
const GEM_VALUE = 25;
const BADGE_BONUS = 50;

/** Set when React asks for a restart — the next create() skips the title wait. */
let autoStartNext = false;

interface GemEntry { s: Phaser.GameObjects.Sprite; alive: boolean }
interface ShrineEntry { x: number; y: number; gem: Phaser.GameObjects.Sprite; done: boolean }
interface BugEntry { s: Phaser.GameObjects.Sprite; def: (typeof BUG_PATROLS)[number]; t: number }

export class DungeonScene extends Phaser.Scene {
  private readonly dungeon = buildDungeon();
  private audio!: AudioSystem;

  private player!: Phaser.GameObjects.Sprite;
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;
  private gems: GemEntry[] = [];
  private shrines: ShrineEntry[] = [];
  private bugs: BugEntry[] = [];
  private sparks!: Phaser.GameObjects.Particles.ParticleEmitter;

  // run state
  private score = 0;
  private hp = MAX_HP;
  private gemsTaken = 0;
  private answered = 0;
  private correct = 0;
  private streak = 0;
  private bestStreak = 0;
  private bugHits = 0;
  private discovered: RunSummary["discovered"] = [];
  private badges: string[] = [];
  private openShrine = -1;
  private openChallenge: ChallengeView | null = null;
  private invulnUntil = 0;
  private walkClock = 0;
  /** idle (title) → playing ⇄ paused | challenge → over */
  private state: "idle" | "playing" | "paused" | "challenge" | "over" = "idle";
  private unsubs: Array<() => void> = [];

  constructor() {
    super("DungeonScene");
  }

  create(): void {
    if (import.meta.env.DEV) {
      const problems = validateDungeon(this.dungeon);
      if (problems.length) console.warn("dungeon layout problems:", problems);
    }

    this.audio = this.registry.get("audio") as AudioSystem;

    // ——— ground: one blitter per texture (floor under walls) ———
    const floorB = this.add.blitter(0, 0, "floor").setDepth(-2);
    const wallB = this.add.blitter(0, 0, "wall").setDepth(-1);
    for (let y = 0; y < MAP_H; y++) {
      for (let x = 0; x < MAP_W; x++) {
        (this.dungeon.walls[y * MAP_W + x] === 1 ? wallB : floorB).create(x * TILE, y * TILE);
      }
    }

    // ——— gems ———
    this.gems = GEM_TILES.map((g) => {
      const s = this.add.sprite((g.x + 0.5) * TILE, (g.y + 0.5) * TILE, "gem").setDepth(4);
      this.tweens.add({ targets: s, y: "-=4", duration: 700, yoyo: true, repeat: -1, ease: "sine.inOut" });
      return { s, alive: true };
    });

    // ——— shrines: pedestal + floating gem ———
    this.shrines = SHRINE_TILES.map((t) => {
      const px = (t.x + 0.5) * TILE;
      const py = (t.y + 0.5) * TILE;
      this.add.image(px, py + 4, "shrine").setDepth(3);
      const gem = this.add.sprite(px, py - 14, "gem").setDepth(4).setScale(1.3);
      this.tweens.add({ targets: gem, y: "-=5", duration: 600, yoyo: true, repeat: -1, ease: "sine.inOut" });
      return { x: px, y: py, gem, done: false };
    });

    // ——— bugs ———
    this.bugs = BUG_PATROLS.map((def, i) => ({
      s: this.add.sprite((def.x1 + 0.5) * TILE, (def.y1 + 0.5) * TILE, "bug0").setDepth(5),
      def,
      t: i * 55,
    }));

    // ——— player ———
    const px = (PLAYER_START.x + 0.5) * TILE;
    const py = (PLAYER_START.y + 0.5) * TILE;
    this.player = this.add.sprite(px, py, "player0").setDepth(6);

    // ——— pickup particles ———
    this.sparks = this.add.particles(0, 0, "spark", {
      speed: { min: 40, max: 130 },
      lifespan: 420,
      scale: { start: 1.2, end: 0 },
      quantity: 10,
      emitting: false,
    }).setDepth(9);

    // ——— camera ———
    const cam = this.cameras.main;
    cam.setBounds(0, 0, MAP_W * TILE, MAP_H * TILE);
    cam.setZoom(2);
    cam.startFollow(this.player, true, 0.12, 0.12);

    // ——— input ———
    const kb = this.input.keyboard;
    this.keys = kb
      ? kb.addKeys("W,A,S,D,UP,DOWN,LEFT,RIGHT,SPACE,ESC") as Record<string, Phaser.Input.Keyboard.Key>
      : {} as Record<string, Phaser.Input.Keyboard.Key>;

    // ——— overlay bridge ———
    this.unsubs.push(
      bus.on("challengeAnswer", (idx) => this.gradeAnswer(idx)),
      bus.on("action", (a) => {
        if (a === "start") this.startRun();
        else if (a === "resume") this.resumeFromChallenge();
        else if (a === "restart") { autoStartNext = true; this.scene.restart(); }
      }),
    );
    this.events.once("shutdown", () => {
      this.unsubs.forEach((off) => off());
      this.unsubs = [];
      this.audio?.stopMusic();
      delete window.__gameProbe;
    });

    // ——— self-check contract ———
    window.__gameProbe = () => ({ x: this.player.x, y: this.player.y, z: this.player.y });
    this.resetRun();
    if (autoStartNext) {
      autoStartNext = false;
      this.startRun();
    }
    window.__GAME_READY__ = true; // first frame renders this same tick
  }

  // ——— run lifecycle ———

  private resetRun(): void {
    this.score = 0;
    this.hp = MAX_HP;
    this.gemsTaken = 0;
    this.answered = 0;
    this.correct = 0;
    this.streak = 0;
    this.bestStreak = 0;
    this.bugHits = 0;
    this.discovered = [];
    this.badges = [];
    this.openShrine = -1;
    this.openChallenge = null;
    this.invulnUntil = 0;
    this.state = "idle";
    this.emitHud();
  }

  private startRun(): void {
    if (this.state !== "idle") return;
    this.state = "playing";
    bus.emit("screen", "playing");
    this.audio.sfx("ui");
    this.audio.startMusic();
  }

  private resumeFromChallenge(): void {
    if (this.state !== "challenge") return;
    if (this.answered >= SHRINE_CHALLENGES.length) {
      this.finish(true);
      return;
    }
    this.state = "playing";
    bus.emit("screen", "playing");
  }

  private togglePause(): void {
    if (this.state === "playing") {
      this.state = "paused";
      bus.emit("screen", "paused");
      this.audio.sfx("pause");
    } else if (this.state === "paused") {
      this.state = "playing";
      bus.emit("screen", "playing");
      this.audio.sfx("pause");
    }
  }

  private finish(win: boolean): void {
    if (this.state === "over") return;
    this.state = "over";
    this.audio.stopMusic();

    if (this.bugHits === 0) this.badges.push("Flawless Raider");
    if (this.gemsTaken === GEM_TILES.length) this.badges.push("Gem Hoarder");
    if (this.correct === SHRINE_CHALLENGES.length) this.badges.push("Perfect Scholar");
    this.score += this.badges.length * BADGE_BONUS;

    const newBest = this.score > highScore.get();
    if (newBest) highScore.set(this.score);

    const summary: RunSummary = {
      score: this.score,
      found: this.answered,
      total: SHRINE_CHALLENGES.length,
      gems: this.gemsTaken,
      gemsTotal: GEM_TILES.length,
      bestStreak: this.bestStreak,
      bugHits: this.bugHits,
      badges: this.badges,
      newBest,
      discovered: this.discovered,
    };
    bus.emit(win ? "victory" : "gameover", summary);
    bus.emit("screen", win ? "victory" : "gameover");
    bus.emit("toast", {
      text: newBest ? `New best score: ${this.score}!` : "",
      kind: "badge",
    });
    this.audio.sfx(win ? "victory" : "defeat");
    if (win) this.cameras.main.flash(300, 110, 240, 255);
  }

  // ——— challenges ———

  private openShrineChallenge(i: number): void {
    this.openShrine = i;
    this.openChallenge = buildChallenge(SHRINE_CHALLENGES[i]);
    this.state = "challenge";
    bus.emit("challenge", this.openChallenge);
    this.audio.sfx("shrine");
  }

  private gradeAnswer(idx: number): void {
    if (this.state !== "challenge" || !this.openChallenge) return;
    const view = this.openChallenge;
    const repo = view.repo;
    const isCorrect = idx === view.correctIndex;

    if (isCorrect) {
      this.streak++;
      this.correct++;
      this.bestStreak = Math.max(this.bestStreak, this.streak);
      const mult = Math.min(4, 1 + 0.25 * (this.streak - 1));
      this.score += Math.round(TIER_SCORE[repo.tier] * mult);
      this.audio.sfx("correct");
    } else {
      this.streak = 0;
      this.audio.sfx("wrong");
    }

    this.answered++;
    if (!this.discovered.some((d) => d.name === repo.name && d.owner === repo.owner)) {
      this.discovered.push({ owner: repo.owner, name: repo.name, url: repo.url, tier: repo.tier });
    }
    const shrine = this.shrines[this.openShrine];
    if (shrine) {
      shrine.done = true;
      shrine.gem.setAlpha(0.25).setTint(0x6a7686);
      this.sparks.explode(12, shrine.x, shrine.y - 14);
    }

    bus.emit("challengeResult", { correct: isCorrect, fact: repo.blurb, url: repo.url, repoName: `${repo.owner}/${repo.name}` });
    this.emitHud();
    this.openChallenge = null;
  }

  // ——— main loop ———

  override update(_time: number, delta: number): void {
    const dt = Math.min(delta, 50) / 1000;
    const now = this.time.now;

    // Escape pauses (never while an overlay modal owns the screen)
    const esc = this.keys.ESC;
    if (esc && Phaser.Input.Keyboard.JustDown(esc) && !this.typing()) this.togglePause();

    // Space starts the run from the title screen
    const space = this.keys.SPACE;
    if (space && Phaser.Input.Keyboard.JustDown(space) && this.state === "idle" && !this.typing()) this.startRun();

    // bugs + gem sparkle keep animating in every state (title backdrop too)
    this.moveBugs(dt);

    if (this.state !== "playing") return;

    this.movePlayer(dt);
    this.checkGems();
    this.checkShrines();
    this.checkBugs(now);
  }

  private typing(): boolean {
    const el = document.activeElement;
    return el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement;
  }

  private movePlayer(dt: number): void {
    const k = this.keys;
    let vx = 0;
    let vy = 0;
    if (k.A?.isDown || k.LEFT?.isDown) vx -= 1;
    if (k.D?.isDown || k.RIGHT?.isDown) vx += 1;
    if (k.W?.isDown || k.UP?.isDown) vy -= 1;
    if (k.S?.isDown || k.DOWN?.isDown) vy += 1;
    if (vx === 0 && vy === 0) {
      this.player.setTexture("player0");
      return;
    }
    const norm = Math.hypot(vx, vy);
    vx /= norm;
    vy /= norm;

    // axis-separated tile collision — walls always block, corridors always fit
    const nx = this.player.x + vx * PLAYER_SPEED * dt;
    if (!this.blocked(nx, this.player.y)) this.player.x = nx;
    const ny = this.player.y + vy * PLAYER_SPEED * dt;
    if (!this.blocked(this.player.x, ny)) this.player.y = ny;

    this.player.setFlipX(vx < 0);
    this.walkClock += dt;
    this.player.setTexture(this.walkClock % 0.36 < 0.18 ? "player0" : "player1");
  }

  private tileAt(px: number, py: number): number {
    const tx = Math.floor(px / TILE);
    const ty = Math.floor(py / TILE);
    if (tx < 0 || ty < 0 || tx >= MAP_W || ty >= MAP_H) return 1;
    return this.dungeon.walls[ty * MAP_W + tx];
  }

  /** True when any corner of the player's hitbox would sit inside a wall. */
  private blocked(cx: number, cy: number): boolean {
    const h = HITBOX;
    return (
      this.tileAt(cx - h, cy - h) === 1 ||
      this.tileAt(cx + h, cy - h) === 1 ||
      this.tileAt(cx - h, cy + h) === 1 ||
      this.tileAt(cx + h, cy + h) === 1
    );
  }

  private moveBugs(dt: number): void {
    for (const b of this.bugs) {
      const { x1, y1, x2, y2, speed } = b.def;
      const total = (Math.abs(x2 - x1) + Math.abs(y2 - y1)) * TILE;
      if (total === 0) continue;
      b.t += speed * dt;
      const u = b.t % (2 * total);
      const d = u < total ? u : 2 * total - u;
      const frac = d / total;
      const fx = x1 + (x2 - x1) * frac;
      const fy = y1 + (y2 - y1) * frac;
      b.s.setPosition((fx + 0.5) * TILE, (fy + 0.5) * TILE);
      const vx = Math.sign(x2 - x1) * (u < total ? 1 : -1);
      if (vx !== 0) b.s.setFlipX(vx < 0);
      b.s.setTexture(Math.floor(b.t / 160) % 2 === 0 ? "bug0" : "bug1");
    }
  }

  private checkGems(): void {
    for (const g of this.gems) {
      if (!g.alive) continue;
      if (Phaser.Math.Distance.Between(this.player.x, this.player.y, g.s.x, g.s.y) < PICKUP_DIST) {
        g.alive = false;
        g.s.destroy();
        this.gemsTaken++;
        this.score += GEM_VALUE;
        this.sparks.explode(10, g.s.x, g.s.y);
        this.audio.sfx("gem");
        this.emitHud();
      }
    }
  }

  private checkShrines(): void {
    for (let i = 0; i < this.shrines.length; i++) {
      const s = this.shrines[i];
      if (s.done) continue;
      if (Phaser.Math.Distance.Between(this.player.x, this.player.y, s.x, s.y) < SHRINE_DIST) {
        this.openShrineChallenge(i);
        return;
      }
    }
  }

  private checkBugs(now: number): void {
    if (now < this.invulnUntil) {
      // invulnerability flicker
      this.player.setAlpha(Math.floor(now / 90) % 2 === 0 ? 0.45 : 1);
      return;
    }
    this.player.setAlpha(1);
    for (const b of this.bugs) {
      if (Phaser.Math.Distance.Between(this.player.x, this.player.y, b.s.x, b.s.y) < BUG_DIST) {
        this.hurt(b.s.x, b.s.y, now);
        return;
      }
    }
  }

  private hurt(bx: number, by: number, now: number): void {
    this.hp--;
    this.bugHits++;
    this.streak = 0;
    this.invulnUntil = now + IFRAMES_MS;
    // knockback away from the bug, still inside walls
    const dx = Math.sign(this.player.x - bx) * 18;
    const dy = Math.sign(this.player.y - by) * 18;
    if (!this.blocked(this.player.x + dx, this.player.y)) this.player.x += dx;
    if (!this.blocked(this.player.x, this.player.y + dy)) this.player.y += dy;
    this.cameras.main.shake(140, 0.004);
    this.cameras.main.flash(110, 255, 70, 90);
    this.audio.sfx("hurt");
    this.emitHud();
    if (this.hp <= 0) this.finish(false);
  }

  private emitHud(): void {
    const hud: HudState = {
      score: this.score,
      hp: Math.max(0, this.hp),
      gems: this.gemsTaken,
      gemsTotal: GEM_TILES.length,
      found: this.answered,
      total: SHRINE_CHALLENGES.length,
      streak: this.streak,
      multiplier: Math.min(4, 1 + 0.25 * this.streak),
    };
    bus.emit("hud", hud);
  }
}
