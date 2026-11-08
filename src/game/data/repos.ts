/**
 * repos.ts — the vault dataset: real open-source repos that star in the dungeon.
 * Facts (language, purpose, maintenance status) are curated from public knowledge;
 * no live star counts are hard-coded — gems are labeled by tier instead, so the
 * dataset never goes stale. Swap/extend freely; challenges reference repos by id.
 */

export type Tier = "buried" | "hidden gem" | "rising";

export interface RepoInfo {
  id: string;
  owner: string;
  name: string;
  language: string;
  tier: Tier;
  blurb: string;
  topics: string[];
  url: string;
}

export const REPOS: RepoInfo[] = [
  {
    id: "bat",
    owner: "sharkdp",
    name: "bat",
    language: "Rust",
    tier: "rising",
    blurb: "A cat clone with wings: syntax highlighting, git integration and line numbers in the terminal.",
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
    topics: ["python", "packaging"],
    url: "https://github.com/astral-sh/uv",
  },
];

export function repoById(id: string): RepoInfo {
  const r = REPOS.find((r) => r.id === id);
  if (!r) throw new Error(`unknown repo id: ${id}`);
  return r;
}

/** Challenge archetypes found at shrine pedestals. */
export type ChallengeType = "language" | "maintained" | "readme";

export interface ChallengeDef {
  type: ChallengeType;
  /** Primary repo (and for "maintained", repoB is the rival). */
  repoId: string;
  repoBId?: string;
  /** Multiple-choice pool; correct answer is derived from repo facts. */
  options: string[];
}

export interface ChallengeView {
  type: ChallengeType;
  prompt: string;
  repo: RepoInfo;
  repoB?: RepoInfo;
  options: string[];
  correctIndex: number;
  /** Flavor text shown on the pedestal card. */
  hint: string;
}

export const SHRINE_CHALLENGES: ChallengeDef[] = [
  { type: "language", repoId: "bat", options: ["Rust", "Go", "Python", "C"] },
  { type: "language", repoId: "fzf", options: ["Rust", "Go", "C", "Shell"] },
  { type: "readme", repoId: "thefuck", options: ["Corrects typos in your previous shell command", "Auto-formats Python code", "Deletes unused packages", "Spell-checks your documentation"] },
  { type: "language", repoId: "lazygit", options: ["Go", "Rust", "TypeScript", "C"] },
  { type: "maintained", repoId: "fastfetch", repoBId: "neofetch", options: [] },
  { type: "maintained", repoId: "eza", repoBId: "exa", options: [] },
  { type: "language", repoId: "delta", options: ["Rust", "Python", "Java", "Shell"] },
  { type: "readme", repoId: "zoxide", options: ["Jumps to directories you use often", "Cleans up temp files", "Monitors disk usage", "Themes your terminal"] },
];

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

/** Build the playable view for a challenge (correct answer computed from facts). */
export function buildChallenge(def: ChallengeDef): ChallengeView {
  const repo = repoById(def.repoId);
  switch (def.type) {
    case "language": {
      const correctIndex = def.options.indexOf(repo.language);
      return {
        type: def.type,
        prompt: `Which language powers ${repo.owner}/${repo.name}?`,
        repo,
        options: def.options,
        correctIndex,
        hint: repo.blurb,
      };
    }
    case "readme": {
      // correctIndex = 0 by construction of the options pool above.
      return {
        type: def.type,
        prompt: `${repo.owner}/${repo.name} — “${repo.blurb}” What does it actually do?`,
        repo,
        options: def.options,
        correctIndex: 0,
        hint: "Read the scroll closely, hunter.",
      };
    }
    case "maintained": {
      const repoB = repoById(def.repoBId!);
      // The actively maintained one is always the primary repo (fastfetch/eza).
      return {
        type: def.type,
        prompt: "Only ONE of these repos is still actively maintained. Pick the safe bet:",
        repo,
        repoB,
        options: [`${repo.owner}/${repo.name}`, `${repoB.owner}/${repoB.name}`],
        correctIndex: 0,
        hint: "Maintainers leave traces: recent commits, releases… or an archived repo.",
      };
    }
  }
}
