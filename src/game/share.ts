/**
 * share.ts — renders a retro "discovery card" to a canvas and downloads it as PNG,
 * with a copyable text blurb. All drawing is parametric (no image assets).
 */

import type { RunSummary } from "./bus";

export function shareText(summary: RunSummary, handle: string): string {
  const lines = summary.discovered.slice(0, 3).map((d) => `  🔍 ${d.owner}/${d.name}`).join("\n");
  return [
    `I just raided the dungeon in HIDDEN REPO HUNTER ⚔️`,
    `Score ${summary.score} · ${summary.found}/${summary.total} repos found · best streak ×${summary.bestStreak}`,
    lines ? `Gems I unearthed:\n${lines}` : "",
    `Can you find more buried treasure? 🗝️`,
  ].filter(Boolean).join("\n");
}

const W = 1200;
const H = 630;

export async function downloadShareCard(summary: RunSummary, handle: string): Promise<void> {
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const g = canvas.getContext("2d")!;

  // background
  const grad = g.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, "#0d1220");
  grad.addColorStop(1, "#131a2e");
  g.fillStyle = grad;
  g.fillRect(0, 0, W, H);

  // dungeon-brick border
  g.strokeStyle = "#2a3a5c";
  g.lineWidth = 6;
  g.strokeRect(18, 18, W - 36, H - 36);
  g.strokeStyle = "#1a2438";
  g.lineWidth = 2;
  for (let x = 40; x < W - 40; x += 56) {
    g.strokeRect(x, 20, 54, 20);
    g.strokeRect(x + 27, H - 40, 54, 20);
  }

  const pixelFont = (px: number) => `${px}px ui-monospace, Menlo, Consolas, monospace`;

  g.textAlign = "center";
  g.fillStyle = "#8df0c1";
  g.font = pixelFont(64);
  g.fillText("HIDDEN REPO HUNTER", W / 2, 130);

  g.fillStyle = "#6ee7ff";
  g.font = pixelFont(30);
  g.fillText(`@${handle} raided the dungeon`, W / 2, 195);

  // stat blocks
  const stats: Array<[string, string, string]> = [
    ["SCORE", String(summary.score), "#ffd166"],
    ["REPOS FOUND", `${summary.found}/${summary.total}`, "#8df0c1"],
    ["BEST STREAK", `x${summary.bestStreak}`, "#ff9de2"],
    ["GEMS", `${summary.gems}/${summary.gemsTotal}`, "#6ee7ff"],
  ];
  const bw = 220, gap = 30, x0 = (W - (bw * 4 + gap * 3)) / 2;
  stats.forEach(([label, value, color], i) => {
    const x = x0 + i * (bw + gap);
    g.fillStyle = "#161f36";
    g.fillRect(x, 240, bw, 110);
    g.strokeStyle = "#2a3a5c";
    g.lineWidth = 3;
    g.strokeRect(x, 240, bw, 110);
    g.fillStyle = "#8b9bb4";
    g.font = pixelFont(20);
    g.fillText(label, x + bw / 2, 275);
    g.fillStyle = color;
    g.font = pixelFont(42);
    g.fillText(value, x + bw / 2, 330);
  });

  // discovered repos
  g.fillStyle = "#8b9bb4";
  g.font = pixelFont(22);
  g.fillText("— UNEARTHED —", W / 2, 405);
  g.font = pixelFont(24);
  const shown = summary.discovered.slice(0, 5);
  shown.forEach((d, i) => {
    g.fillStyle = "#c7d3e8";
    g.fillText(`${d.owner}/${d.name}`, W / 2, 448 + i * 32);
  });
  if (summary.discovered.length > 5) {
    g.fillStyle = "#5c6b84";
    g.font = pixelFont(20);
    g.fillText(`+ ${summary.discovered.length - 5} more…`, W / 2, 448 + 5 * 32);
  }

  g.fillStyle = "#8df0c1";
  g.font = pixelFont(22);
  g.fillText("What buried treasure will YOU find? 🗝️", W / 2, H - 55);

  // download
  const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/png"));
  if (!blob) return;
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `hidden-repo-hunter-${summary.score}.png`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}
