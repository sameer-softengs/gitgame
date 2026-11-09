/**
 * boot.ts — HIDDEN REPO HUNTER bootstrap: mounts Phaser onto the canvas that
 * src/pages/Home.tsx renders, and owns the audio system lifecycle.
 *
 * Contract with the React shell:
 *   startGame(canvas)  mounts the game onto the existing <canvas>
 *   stopGame()         tears the game + audio down (loop, listeners, probe)
 * Calling startGame twice is safe: the previous session is stopped first, so React
 * StrictMode's dev double mount never leaves two renderers alive.
 *
 * Contract with scripts/verify-game.mjs (lives in DungeonScene/Scene flow):
 *   window.__GAME_READY__ = true once the dungeon is built
 *   window.__gameProbe()  → player coordinates for direction assertions
 *   Space starts the run; W/A/S/D move; Escape pauses.
 */

import Phaser from "phaser";
import { BootScene } from "./scenes/BootScene";
import { DungeonScene } from "./scenes/DungeonScene";
import { AudioSystem } from "./audio";

declare global {
  interface Window {
    /** Player-coordinate probe — scripts/verify-game.mjs asserts direction mapping through it. */
    __gameProbe?: () => { x: number; y: number; z: number };
    /** Readiness signal — the self-check waits for it before screenshotting/asserting. */
    __GAME_READY__?: boolean;
  }
}

let session: { dispose: () => void } | null = null;
let currentAudio: AudioSystem | null = null;

/** Mute toggle for the HUD button; safe to call any time. */
export function toggleMute(): boolean {
  if (!currentAudio) return false;
  currentAudio.toggleMute();
  return currentAudio.muted;
}

export function isMuted(): boolean {
  return currentAudio?.muted ?? false;
}

export function startGame(canvas: HTMLCanvasElement): void {
  stopGame();

  const audio = new AudioSystem();
  currentAudio = audio;

  const game = new Phaser.Game({
    // WEBGL, not AUTO: Phaser refuses AUTO when mounting onto an existing canvas
    // ("Must set explicit renderType in custom environment").
    type: Phaser.WEBGL,
    canvas,
    pixelArt: true,
    preserveDrawingBuffer: true, // lets the self-check read the drawing buffer
    backgroundColor: "#0b0e12",
    scale: {
      mode: Phaser.Scale.RESIZE,
      autoCenter: Phaser.Scale.NO_CENTER,
      width: window.innerWidth,
      height: window.innerHeight,
    },
    scene: [BootScene, DungeonScene],
  });
  game.registry.set("audio", audio);

  session = {
    dispose: () => {
      window.__GAME_READY__ = false;
      delete window.__gameProbe;
      game.destroy(false); // the canvas is React-owned — keep it mounted
      audio.dispose();
      currentAudio = null;
    },
  };
}

export function stopGame(): void {
  session?.dispose();
  session = null;
}
