# ⚔️ Hidden Repo Hunter

> A pixel dungeon where every gem is a **real, underrated open-source repository**.
> Explore the vault, prove your open-source knowledge at ancient shrines, dodge the bugs —
> then open and star the repos you rescued so they finally get the hype they deserve.

**Play free in your browser — no install, no account needed.** *(link lands here after the first GitHub Pages deploy)*

Badges: ![Deploy to GitHub Pages](https://github.com/YOUR-USER/YOUR-REPO/actions/workflows/deploy-pages.yml/badge.svg)

---

## Why this game exists

Thousands of genuinely useful open-source repos sit buried under **10, 20, 50 stars** while
duplicated, abandoned or hype-driven projects soak up all the attention. Discovery on GitHub
skews toward what's already popular.

**Hidden Repo Hunter** flips that: the game loop *rewards* finding and boosting low-star gems.
Every shrine quiz teaches you what a real project does, every treasure chest links straight to
the repository, and the end-of-run share card is built to make your discoveries spread —
so the repos get stars, and you get the reputation of the hunter who found them first.

## How to play

| Action | Control |
| --- | --- |
| Move | `W` `A` `S` `D` or arrow keys |
| Start / restart | `Space` or click |
| Pause | `Esc` |
| Sound toggle | 🔊 button (top-right) |

- 💎 **Gems** — sparkles scattered across the vault. Collect them for points.
- 🏛 **Shrines** — answer a multiple-choice quiz about a *real* repository
  (what it does, what language powers it, which fork is still maintained).
  Correct answers build a score multiplier — and add the repo to your discovery card.
- 🐛 **Bugs** — red and hostile. Touch one and you lose a heart. Three hearts, no respawns.
- 🏆 **Victory** — unearth all 8 shrines, keep your streak, earn badges
  (*Flawless Raider*, *Gem Hoarder*, *Perfect Scholar*), then share your card —
  every entry links to the repo so your friends can star it too.

## Featured gems inside

The dungeon stars projects like [bat](https://github.com/sharkdp/bat), [zoxide](https://github.com/ajeetdsouza/zoxide),
[delta](https://github.com/dandavison/delta), [eza](https://github.com/eza-community/eza), [fastfetch](https://github.com/fastfetch-cli/fastfetch)
and more — curated to teach the difference between *buried treasure*, *hidden gems* and *rising stars*.
Play, then go star your favorites.

## Tech

- [Phaser 3](https://phaser.io) — rendering, scenes, tweens & particles (all textures generated in code, zero asset files)
- [React 19](https://react.dev) — HUD overlay, challenge modals, share flow (decoupled from the game loop via a tiny event bus)
- [Vite](https://vite.dev) + TypeScript — build & dev server
- Web Audio — synthesized chiptune + SFX, no audio files
- Optional GitHub Device-Flow login — drop your OAuth app client id into `src/game/config.ts`

## Run it locally

```bash
npm install
npm run dev        # dev server on :3000
npm run build      # type-check + production build → dist/
npm run verify     # Playwright smoke check (render, controls, zero console errors)
```

## 📣 Make the game findable (repo-owner checklist)

GitHub search ranks repos on **description, topics, README and stars**. After publishing:

1. **About description** (repo sidebar → ⚙️):
   `A pixel dungeon where every gem is a real, underrated GitHub repo. Find hidden-gem open source, dodge bugs, star what you rescue.`
2. **Website** (same sidebar): your Pages URL.
3. **Topics** (add all of these):
   `game` `github` `phaser` `react` `typescript` `open-source` `indie-game`
   `roguelike` `pixel-art` `browser-game` `discovery` `hidden-gems` `developer-tools`
4. **Social preview** (Settings → General → Social preview): upload `public/og-card.png`.
5. **Pin the repo** on your profile and share the run card it prints for you —
   the card is the growth loop.

## Contributing

Ideas welcome, especially **new shrine challenges** (add an entry in `src/game/data/repos.ts`)
and new *genuinely underrated* repos to feature. PRs should keep `npm run verify` green.

## License

MIT — but the featured repositories keep their own licenses; visit their pages.
