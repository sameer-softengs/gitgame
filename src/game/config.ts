/**
 * config.ts — global tuning. Input sensitivity and invert switches live here (sync verify-game.mjs when changing the mapping).
 */

export const INPUT_CONFIG = {
  /** Mouse/touch camera sensitivity (radians/pixel). */
  MOUSE_SENS_X: 0.0026,
  MOUSE_SENS_Y: 0.0022,
  /** Camera invert switches: default false = mouse right turns camera right, mouse up looks up (intuitive directions). */
  INVERT_X: false,
  INVERT_Y: false,
} as const;

export const QUALITY = {
  /** Degradation tier for insufficient performance: cut particles and effects instead of dropping frames. */
  PARTICLES_HIGH: 500,
  PARTICLES_LOW: 150,
  /** Auto-degrade when the frame rate stays below this for 2s. */
  DEGRADE_FPS: 45,
} as const;

export const CONFIG = {
  /**
   * GitHub OAuth App client id — powers the "Connect GitHub" login via the Device
   * Authorization Flow (no secret needed; works on a pure static GitHub Pages site).
   * Leave empty to hide the login button (guest profiles only).
   */
  GITHUB_CLIENT_ID: "",
  /**
   * The game's public URL — used in share text and the hunter badge link.
   * UPDATE after deploy, same as the canonical/og:url placeholders in index.html.
   */
  GAME_URL: "https://sameer-softeng.github.io/gitgame/",
} as const;

/** Convenience top-level export — used by share text and the hunter badge link. */
export const GAME_URL = CONFIG.GAME_URL;

export const COLORS = {
  background: 0x0b0e12,
} as const;
