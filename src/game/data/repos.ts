/**
 * repos.ts — the vault dataset + shared challenge types.
 * Facts (language, purpose, maintenance status) are curated from public knowledge;
 * no star counts are hard-coded — gems are labeled by tier, so the dataset never
 * goes stale. QUESTIONS ARE NOT DEFINED HERE: the question engine (questions.ts)
 * procedurally generates every challenge from this data, live GitHub data, or any
 * other pool it is handed.
 */

export type Tier = "buried" | "hidden gem" | "rising";
export type Difficulty = "easy" | "medium" | "hard";
export type QuestionKind = "language" | "purpose" | "maintained" | "stars";

/** The light shape a question needs — curated AND live-fetched repos both satisfy it. */
export interface ChallengeRepo {
  owner: string;
  name: string;
  language: string;
  url: string;
  blurb: string;
  /** How the repo achieves what it does — implementation flavor shown after answering. */
  how: string;
  /** Why it's efficient, underrated or historically interesting — the hype line. */
  why: string;
  tier: Tier;
  /** Live-fetched repos only: the real star count (powers the "ledger" questions). */
  stars?: number;
}

export interface RepoInfo extends ChallengeRepo {
  id: string;
  topics: string[];
  /** When this repo died, which repo carries its spirit? (drives "maintained" pair questions) */
  successorOf?: string;
}

export interface ChallengeView {
  type: QuestionKind;
  /** Run position: first shrines easy, middle medium, last ones hard (the Mafia). */
  level: Difficulty;
  prompt: string;
  repo: ChallengeRepo;
  repoB?: { owner: string; name: string };
  options: string[];
  correctIndex: number;
  /** Flavor text shown on the pedestal card. */
  hint: string;
}

export const REPOS: RepoInfo[] = [
  {
    id: "bat",
    owner: "sharkdp",
    name: "bat",
    language: "Rust",
    tier: "rising",
    blurb: "A cat clone with wings: syntax highlighting, git integration and line numbers in the terminal.",
    how: "Written in Rust: syntax highlighting via syntect's incremental parser, large files streamed instead of loaded, and automatic paging that integrates with git diffs.",
    why: "The definitive drop-in cat replacement — it grew almost purely by word of mouth in dotfile shares and terminal screenshots. If you still type plain cat, this is your easiest upgrade star.",
    topics: ["cli", "syntax-highlighting", "terminal"],
    url: "https://github.com/sharkdp/bat",
  },
  {
    id: "fzf",
    owner: "junegunn",
    name: "fzf",
    language: "Go",
    tier: "rising",
    blurb: "A general-purpose command-line fuzzy finder that filters anything you pipe into it.",
    how: "A single Go binary that reads any list from stdin and fuzzy-matches it in a TUI — sub-16ms filtering even over shell history with millions of lines.",
    why: "It pipes EVERYTHING: history search, cd, git branches, kill. Less a tool, more a terminal superpower — and it spread one dotfile at a time.",
    topics: ["cli", "fuzzy-search", "terminal"],
    url: "https://github.com/junegunn/fzf",
  },
  {
    id: "thefuck",
    owner: "nvbn",
    name: "thefuck",
    language: "Python",
    tier: "hidden gem",
    blurb: "Magnificent app which corrects your previous console command.",
    how: "A Python rule engine: your failed command is matched against hundreds of patterns, a fix is proposed, and one confirmation key re-runs it.",
    why: "The joke name kept it off serious tool lists for years — underneath sits a genuinely clever rules DSL that has silently fixed millions of mistyped commands.",
    topics: ["cli", "shell", "productivity"],
    url: "https://github.com/nvbn/thefuck",
  },
  {
    id: "lazygit",
    owner: "jesseduffield",
    name: "lazygit",
    language: "Go",
    tier: "rising",
    blurb: "Simple terminal UI for git commands — stage, commit, rebase and resolve conflicts visually.",
    how: "A Go TUI wrapping git plumbing into live panels: stage hunks line-by-line, interactive rebase, cherry-pick and bisect — no flags to memorize.",
    why: "It turned git's scariest operations (rebase --onto, fixup chains) into keyboard rituals. Most people discover it from a screenshot of someone else's terminal.",
    topics: ["git", "tui", "terminal"],
    url: "https://github.com/jesseduffield/lazygit",
  },
  {
    id: "neofetch",
    owner: "dylanaraps",
    name: "neofetch",
    language: "Shell",
    tier: "buried",
    blurb: "The classic CLI system-information tool. The upstream repo was archived and is no longer maintained.",
    how: "A POSIX shell script that scrapes system info and prints it beside an ASCII logo — one file, no daemon, zero config.",
    why: "Archived by its maintainer in 2024 — a fossil now. A great tool with a dead repo: the classic lesson in checking a project's pulse before relying on it.",
    topics: ["cli", "system-info"],
    url: "https://github.com/dylanaraps/neofetch",
  },
  {
    id: "fastfetch",
    owner: "fastfetch-cli",
    name: "fastfetch",
    language: "C",
    tier: "hidden gem",
    blurb: "A maintained, fast neofetch-like system information tool with active releases.",
    how: "A C rewrite of neofetch with threaded info collection and JSON-driven configuration — same screenshot energy, a fraction of the startup time.",
    why: "The community fork that took over when neofetch died. Proof that maintained is a feature: read the last commit date, not the star count.",
    successorOf: "neofetch",
    topics: ["cli", "system-info", "active"],
    url: "https://github.com/fastfetch-cli/fastfetch",
  },
  {
    id: "exa",
    owner: "ogham",
    name: "exa",
    language: "Rust",
    tier: "buried",
    blurb: "A modern replacement for ls. The original repo stopped being maintained years ago.",
    how: "A Rust ls rewrite with tree views, git status columns and file icons, built on a parallel filesystem walker.",
    why: "Development stalled around 2021 — beautiful code slowly going stale. Knowing how to spot this state is half of safe tool shopping.",
    topics: ["cli", "file-manager"],
    url: "https://github.com/ogham/exa",
  },
  {
    id: "eza",
    owner: "eza-community",
    name: "eza",
    language: "Rust",
    tier: "hidden gem",
    blurb: "A modern, maintained replacement for ls — the community fork that kept exa's spirit alive.",
    how: "Same Rust core as exa, kept alive by the community: hyperlinked output, new sorting options and regularly reviewed, released PRs.",
    why: "Forks usually die with their parents — this one didn't. The underrated comeback that makes reading a repo's fork graph a real skill.",
    successorOf: "exa",
    topics: ["cli", "file-manager", "active"],
    url: "https://github.com/eza-community/eza",
  },
  {
    id: "delta",
    owner: "dandavison",
    name: "delta",
    language: "Rust",
    tier: "hidden gem",
    blurb: "A syntax-highlighting pager for git, diff-so-fancy's spiritual successor — beautiful diffs.",
    how: "A Rust pager that highlights diffs via syntect, aligns line numbers across side-by-side views and navigates hunks like a pro tool.",
    why: "Most people find it buried inside someone else's dotfiles, then wonder how they ever reviewed diffs un-highlighted.",
    topics: ["git", "diff", "terminal"],
    url: "https://github.com/dandavison/delta",
  },
  {
    id: "zoxide",
    owner: "ajeetdsouza",
    name: "zoxide",
    language: "Rust",
    tier: "hidden gem",
    blurb: "A smarter cd command. It learns which directories you use and lets you jump to them instantly.",
    how: "A tiny Rust binary that records your directory visits in a frecency database (frequency + recency) and fuzzy-jumps with a single z.",
    why: "Ideas from z and autojump, shipped as a small static binary with sub-millisecond jumps — the quiet gem every power user eventually rebuilds their shell around.",
    topics: ["cli", "shell", "productivity"],
    url: "https://github.com/ajeetdsouza/zoxide",
  },
  // Bonus finds — revealed on the victory screen as "more gems to hunt":
  {
    id: "yazi",
    owner: "sxyazi",
    name: "yazi",
    language: "Rust",
    tier: "hidden gem",
    blurb: "Blazing fast terminal file manager written in Rust, based on async I/O.",
    how: "Async Rust architecture: IO and CPU-heavy work runs in background workers, so the UI never blocks — even on directories with tens of thousands of files.",
    why: "Still young and flying under the radar next to decades-old managers — while quietly outperforming them. Get in before the crowd.",
    topics: ["tui", "file-manager"],
    url: "https://github.com/sxyazi/yazi",
  },
  {
    id: "helix",
    owner: "helix-editor",
    name: "helix",
    language: "Rust",
    tier: "rising",
    blurb: "A post-modern modal text editor, Kakoune-inspired, batteries included.",
    how: "A Rust editor using tree-sitter for precise syntax awareness — selection-first Kakoune editing with LSP, themes and keymaps built in, zero plugins required.",
    why: "Vim-class power without the config ceremony. It grew with no plugin marketplace at all — pure out-of-the-box polish.",
    topics: ["editor", "modal"],
    url: "https://github.com/helix-editor/helix",
  },
  {
    id: "starship",
    owner: "starship",
    name: "starship",
    language: "Rust",
    tier: "rising",
    blurb: "The minimal, blazing-fast, infinitely customizable prompt for any shell.",
    how: "A single Rust binary rendering your prompt with async git/status collectors — works across bash, zsh, fish, PowerShell, configured in one TOML file.",
    why: "One prompt for every shell you'll ever touch. Most users arrive while hunting for why their old prompt was slow.",
    topics: ["shell", "prompt"],
    url: "https://github.com/starship/starship",
  },
  {
    id: "uv",
    owner: "astral-sh",
    name: "uv",
    language: "Rust",
    tier: "rising",
    blurb: "An extremely fast Python package and project manager, written in Rust.",
    how: "A Rust rewrite of the pip/venv workflow: a global cache, parallel downloads and copy-on-write links make installs 10-100x faster, drop-in compatible.",
    why: "It exposed how much time Python developers were losing to pip — rising absurdly fast, but it deserves a star in every beginner tutorial, not just power-user setups.",
    topics: ["python", "packaging"],
    url: "https://github.com/astral-sh/uv",
  },
];

export function repoById(id: string): RepoInfo {
  const r = REPOS.find((r) => r.id === id);
  if (!r) throw new Error(`unknown repo id: ${id}`);
  return r;
}

export const TIER_LABEL: Record<Tier, string> = {
  buried: "BURIED TREASURE",
  "hidden gem": "HIDDEN GEM",
  rising: "RISING STAR",
};

export const TIER_SCORE: Record<Tier, number> = {
  buried: 150,
  "hidden gem": 120,
  rising: 100,
};

/** Fisher-Yates shuffle that tracks where the correct answer landed. */
export function shuffleOptions(options: string[], correctIndex: number): { options: string[]; correctIndex: number } {
  const tagged = options.map((text, i) => ({ text, correct: i === correctIndex }));
  for (let i = tagged.length - 1; i > 0; i--) {
    const j = (Math.random() * (i + 1)) | 0;
    [tagged[i], tagged[j]] = [tagged[j], tagged[i]];
  }
  return {
    options: tagged.map((t) => t.text),
    correctIndex: tagged.findIndex((t) => t.correct),
  };
}
