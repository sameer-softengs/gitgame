/**
 * share.ts — the publicity loop:
 *  1. renderShareCard — a simple, elegant "run summary" card (1200x630) drawn on canvas,
 *     no image assets; downloaded as PNG by downloadShareCard.
 *  2. hunterBadge — a shields.io GitHub badge (rank + score) the player pastes into
 *     their profile README: they declare themselves a hunter, we get the link back.
 */

import type { RunSummary } from "./bus";
import { GAME_URL } from "./config";

// ——— hunter rank (the badge reward) ———

export interface Rank { name: string; color: string; hex: string }

/** The rank a run earns — the badge shows it, higher runs = louder badge. */
export function rankFor(summary: RunSummary, win: boolean): Rank {
  if (win && summary.score >= 1000) return { name: "Vault Legend", color: "ffd166", hex: "#ffd166" };
  if (win || summary.score >= 600) return { name: "Gem Hunter", color: "8df0c1", hex: "#8df0c1" };
  return { name: "Buried Digger", color: "6ee7ff", hex: "#6ee7ff" };
}

/** shields.io static badge URL — renders on any GitHub README. */
export function hunterBadgeUrl(summary: RunSummary, win: boolean): string {
  const rank = rankFor(summary, win);
  const message = encodeURIComponent(`${rank.name} | ${summary.score} pts`);
  return `https://img.shields.io/badge/Hidden%20Repo%20Hunter-${message}-${rank.color}?style=for-the-badge&logo=github`;
}

/** Ready-to-paste markdown for a GitHub profile README: badge links back to the game. */
export function hunterBadgeMarkdown(summary: RunSummary, win: boolean): string {
  return `[![Hidden Repo Hunter](${hunterBadgeUrl(summary, win)})](${GAME_URL})`;
}

// ——— share text ———

export function shareText(summary: RunSummary, handle: string): string {
  const lines = summary.discovered.slice(0, 3).map((d) => `  🔍 ${d.owner}/${d.name}`).join("\n");
  return [
    `I just raided the dungeon in HIDDEN REPO HUNTER ⚔️`,
    `Score ${summary.score} · ${summary.found}/${summary.total} repos found · best streak ×${summary.bestStreak}`,
    lines ? `Gems I unearthed:\n${lines}` : "",
    `Can you find more buried treasure? 🗝️`,
    GAME_URL,
  ].filter(Boolean).join("\n");
}

// ——— the card ———

const W = 1200;
const H = 630;

export function renderShareCard(summary: RunSummary, handle: string): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const g = canvas.getContext("2d")!;

  const mono = (px: number, weight = "") => `${weight} ${px}px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace`.trim();
  const center = (text: string, x: number, y: number, font: string, color: string) => {
    g.font = font; g.fillStyle = color; g.textAlign = "center"; g.fillText(text, x, y);
  };

  // calm background: near-solid navy with a barely-there vertical drift
  const grad = g.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, "#0d1220");
  grad.addColorStop(1, "#101728");
  g.fillStyle = grad;
  g.fillRect(0, 0, W, H);

  // elegant double frame
  g.strokeStyle = "#2a3a5c"; g.lineWidth = 2; g.strokeRect(28.5, 24.5, W - 57, H - 49);
  g.strokeStyle = "#1a2438"; g.lineWidth = 1; g.strokeRect(38.5, 34.5, W - 77, H - 69);

  // title + hunter
  center("HIDDEN REPO HUNTER", W / 2, 118, mono(50), "#8df0c1");
  center(`@${handle} raided the dungeon`, W / 2, 166, mono(22), "#8b9bb4");
  divider(g, W / 2 - 160, 196, 320);

  // stats — no boxes, just labels + colored numbers
  const stats: Array<[string, string, string]> = [
    ["SCORE", String(summary.score), "#ffd166"],
    ["REPOS FOUND", `${summary.found}/${summary.total}`, "#8df0c1"],
    ["BEST STREAK", `x${summary.bestStreak}`, "#ff9de2"],
    ["GEMS", `${summary.gems}/${summary.gemsTotal}`, "#6ee7ff"],
  ];
  const colW = 240;
  const x0 = W / 2 - colW * 1.5;
  stats.forEach(([label, value, color], i) => {
    const x = x0 + i * colW + colW / 2;
    center(label, x, 262, mono(15), "#8b9bb4");
    center(value, x, 316, mono(42), color);
  });
  divider(g, W / 2 - 160, 372, 320);

  // unearthed — capped at 3 names; the count lives in the label so nothing can collide
  center(`U N E A R T H E D · ${summary.discovered.length} GEMS`, W / 2, 414, mono(16), "#8b9bb4");
  summary.discovered.slice(0, 3).forEach((d, i) => {
    center(`${d.owner}/${d.name}`, W / 2, 458 + i * 38, mono(24), "#c7d3e8");
  });

  // footer
  center("What buried treasure will YOU find? 🗝️", W / 2, 574, mono(22), "#8df0c1");
  center(GAME_URL, W / 2, 604, mono(15), "#5c6b84");

  return canvas;
}

function divider(g: CanvasRenderingContext2D, x: number, y: number, w: number): void {
  g.strokeStyle = "#2a3a5c"; g.lineWidth = 1;
  g.beginPath(); g.moveTo(x, y + 0.5); g.lineTo(x + w, y + 0.5); g.stroke();
}

export async function downloadShareCard(summary: RunSummary, handle: string): Promise<void> {
  const canvas = renderShareCard(summary, handle);
  const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/png"));
  if (!blob) return;
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `hidden-repo-hunter-${summary.score}.png`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}

// debug hook (same pattern as __gameProbe): renders the card without a real run
declare global {
  interface Window {
    __renderShareCard?: (s: RunSummary, h: string) => string;
    __hunterBadgeUrl?: (s: RunSummary, win: boolean) => string;
  }
}
window.__renderShareCard = (s, h) => renderShareCard(s, h).toDataURL("image/png");
window.__hunterBadgeUrl = (s, w) => hunterBadgeUrl(s, w);
