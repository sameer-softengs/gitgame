/**
 * auth.ts — hunter profile + pluggable GitHub login (Device Authorization Flow).
 *
 * On the Kimi-hosted preview the platform boundary means third-party OAuth (GitHub)
 * cannot run, so players get a local guest profile — the game is fully playable.
 * When the user deploys the exported code to GitHub Pages, they drop an OAuth App's
 * client id into src/game/config.ts (GITHUB_CLIENT_ID) and the "Connect GitHub"
 * button appears, wired to the real device flow (no client secret needed).
 */

import { storage } from "./storage";
import { bus } from "./bus";
import { CONFIG } from "./config";

export interface Profile {
  handle: string;
  githubLogin: string | null;
}

const ADJECTIVES = ["Silent", "Clever", "Brave", "Grumpy", "Nimble", "Cosmic", "Retro", "Binary"];
const NOUNS = ["Fox", "Owl", "Badger", "Moth", "Raven", "Badger2", "Wizard", "Gopher", "Ferret"];

function randomHandle(): string {
  const a = ADJECTIVES[(Math.random() * ADJECTIVES.length) | 0];
  const n = NOUNS[(Math.random() * NOUNS.length) | 0];
  return `${a}${n}${(Math.random() * 90 + 10) | 0}`;
}

export function loadProfile(): Profile {
  const p = storage.get<Profile>("profile", { handle: "", githubLogin: null });
  if (!p.handle) p.handle = randomHandle();
  saveProfile(p);
  return p;
}

export function saveProfile(p: Profile): void {
  storage.set("profile", p);
  bus.emit("profile", { handle: p.handle, githubLogin: p.githubLogin });
}

export function setHandle(handle: string): Profile {
  const p = loadProfile();
  p.handle = handle.trim().slice(0, 18) || p.handle;
  saveProfile(p);
  return p;
}

export function isGitHubLoginConfigured(): boolean {
  return CONFIG.GITHUB_CLIENT_ID.trim().length > 0;
}

interface DeviceCodeResponse {
  device_code: string;
  user_code: string;
  verification_uri: string;
  expires_in: number;
  interval: number;
}

/**
 * GitHub Device Authorization Flow — designed for client-side-only apps: only the
 * OAuth App's client id is required, no secret. Polls until the user authorizes,
 * denies, or the code expires. All progress is reported through the bus.
 */
export async function connectGitHub(): Promise<void> {
  const clientId = CONFIG.GITHUB_CLIENT_ID.trim();
  if (!clientId) return;
  const report = (status: "pending" | "done" | "error", message?: string, extra?: Partial<{ verificationUri: string; userCode: string }>) =>
    bus.emit("githubDevice", {
      verificationUri: extra?.verificationUri ?? "",
      userCode: extra?.userCode ?? "",
      status,
      message,
    });

  try {
    const res = await fetch("https://github.com/login/device/code", {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ client_id: clientId, scope: "read:user" }),
    });
    if (!res.ok) throw new Error(`device/code returned ${res.status}`);
    const data = (await res.json()) as DeviceCodeResponse;
    report("pending", undefined, { verificationUri: data.verification_uri, userCode: data.user_code });

    const deadline = Date.now() + Math.min(data.expires_in, 900) * 1000;
    const intervalMs = Math.max(data.interval + 2, 6) * 1000;

    while (Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, intervalMs));
      const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
        method: "POST",
        headers: { Accept: "application/json", "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: clientId,
          device_code: data.device_code,
          grant_type: "urn:ietf:params:oauth:grant-type:device_code",
        }),
      });
      const token = (await tokenRes.json()) as { access_token?: string; error?: string };
      if (token.access_token) {
        const userRes = await fetch("https://api.github.com/user", {
          headers: { Authorization: `Bearer ${token.access_token}`, Accept: "application/vnd.github+json" },
        });
        const user = (await userRes.json()) as { login?: string };
        const p = loadProfile();
        p.githubLogin = user.login ?? "github-user";
        saveProfile(p);
        report("done", `Connected as ${p.githubLogin}`);
        return;
      }
      if (token.error === "access_denied") throw new Error("Authorization denied");
      if (token.error === "expired_token") throw new Error("Code expired — try again");
      // authorization_pending and slow_down: keep polling
    }
    throw new Error("Timed out waiting for authorization");
  } catch (e) {
    report("error", e instanceof Error ? e.message : "GitHub login failed");
  }
}
