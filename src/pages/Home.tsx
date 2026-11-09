/**
 * Home.tsx — the page that hosts the game canvas.
 *
 * React owns the DOM shell only: canvas + HUD overlay. The overlay subscribes to
 * the bus; the render loop (src/game/) never touches React state, it just emits.
 * Start the game in an effect and tear it down in the cleanup so React
 * StrictMode's mount → unmount → mount cycle does not leak a second renderer.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { startGame, stopGame, toggleMute } from '@/game/boot'
import {
  bus,
  type HudState,
  type RunSummary,
  type ScreenState,
} from '@/game/bus'
import type { ChallengeView } from '@/game/data/repos'
import { loadProfile, setHandle, isGitHubLoginConfigured, connectGitHub, type Profile } from '@/game/auth'
import { highScore } from '@/game/storage'
import { shareText, downloadShareCard } from '@/game/share'

const EMPTY_HUD: HudState = {
  score: 0, hp: 3, gems: 0, gemsTotal: 10, found: 0, total: 8, streak: 0, multiplier: 1,
}

interface Toast { id: number; text: string; kind: "badge" | "info" | "danger" }
let toastId = 0

export default function Home() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    startGame(canvas)
    return () => stopGame()
  }, [])

  return (
    <div id="game-root">
      <canvas id="game-canvas" ref={canvasRef} />
      <div id="ui-overlay">
        <Overlay />
      </div>
    </div>
  )
}

function Overlay() {
  const [screen, setScreen] = useState<ScreenState>('title')
  const [hud, setHud] = useState<HudState>(EMPTY_HUD)
  const [challenge, setChallenge] = useState<ChallengeView | null>(null)
  const [result, setResult] = useState<{ correct: boolean; fact: string; url: string; repoName: string } | null>(null)
  const [summary, setSummary] = useState<RunSummary | null>(null)
  const [toasts, setToasts] = useState<Toast[]>([])
  const [profile, setProfile] = useState<Profile>(() => loadProfile())
  const [best, setBest] = useState(() => highScore.get())
  const [muted, setMuted] = useState(false)
  const [github, setGithub] = useState<{ status: string; userCode: string; verificationUri: string; message?: string } | null>(null)

  useEffect(() => {
    const pushToast = (t: { text: string; kind: Toast['kind'] }) => {
      if (!t.text) return
      const id = ++toastId
      setToasts((ts) => [...ts, { id, ...t }])
      setTimeout(() => setToasts((ts) => ts.filter((x) => x.id !== id)), 3200)
    }
    const offs = [
      bus.on('screen', (s) => {
        setScreen(s)
        // leaving the challenge screen (resume/restart) closes the modal
        if (s !== 'paused') { setChallenge(null); setResult(null) }
        if (s === 'title') setSummary(null)
      }),
      bus.on('hud', setHud),
      bus.on('challenge', (c) => { setResult(null); setChallenge(c) }),
      bus.on('challengeResult', setResult),
      bus.on('victory', (s) => { setSummary(s); setBest(highScore.get()) }),
      bus.on('gameover', (s) => { setSummary(s); setBest(highScore.get()) }),
      bus.on('toast', pushToast),
      bus.on('profile', (p) => setProfile({ ...p })),
      bus.on('githubDevice', (g) => setGithub({ ...g })),
    ]
    return () => offs.forEach((off) => off())
  }, [])

  const restart = useCallback(() => {
    setSummary(null); setChallenge(null); setResult(null)
    bus.emit('action', 'restart')
  }, [])

  return (
    <>
      {(screen === 'playing' || screen === 'paused') && <Hud hud={hud} muted={muted} onMute={() => setMuted(toggleMute())} />}

      {screen === 'paused' && (
        <Center>
          <div className="panel paused-panel">
            <h2>PAUSED</h2>
            <p className="dim">Press Esc to keep hunting.</p>
          </div>
        </Center>
      )}

      {screen === 'title' && (
        <TitleScreen profile={profile} best={best} muted={muted} onMute={() => setMuted(toggleMute())} github={github} />
      )}

      {challenge && (
        <ChallengeModal challenge={challenge} result={result} onAnswer={(i) => bus.emit('challengeAnswer', i)} />
      )}

      {(screen === 'victory' || screen === 'gameover') && summary && (
        <EndScreen summary={summary} win={screen === 'victory'} profile={profile} onRestart={restart} />
      )}

      <div className="toast-stack">
        {toasts.map((t) => <div key={t.id} className={`toast toast-${t.kind}`}>{t.text}</div>)}
      </div>
    </>
  )
}

function Center({ children }: { children: React.ReactNode }) {
  return <div className="center-wrap">{children}</div>
}

// ——— title ———

function TitleScreen({ profile, best, muted, onMute, github }: {
  profile: Profile; best: number; muted: boolean; onMute: () => void
  github: { status: string; userCode: string; verificationUri: string; message?: string } | null
}) {
  const [name, setName] = useState(profile.handle)
  const start = () => bus.emit('action', 'start')

  return (
    <Center>
      <div className="panel title-panel">
        <h1 className="game-title">HIDDEN REPO<br />HUNTER</h1>
        <p className="tagline">Delve the vault. Rescue underrated open-source gems ⚔️</p>
        <p className="dim mission">
          Every gem and shrine is a <b>real repository</b> that deserves more stars than it has.
          Learn what it does, then open it on GitHub — that's how buried treasure gets hype.
        </p>

        <div className="howto">
          <span><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> / arrows — move</span>
          <span>💎 collect gems · 🏛 answer shrines · 🐛 dodge bugs</span>
          <span><kbd>Esc</kbd> pause</span>
        </div>

        <button className="btn btn-primary" onClick={start}>Descend into the vault ⤵</button>
        {best > 0 && <p className="dim">Best score: <b className="gold">{best}</b></p>}

        <div className="profile-row">
          <label htmlFor="handle">Hunter:</label>
          <input
            id="handle"
            value={name}
            maxLength={18}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => setHandle(name)}
            onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
          />
          {isGitHubLoginConfigured() && profile.githubLogin === null && (
            <button className="btn" onClick={() => void connectGitHub()}>Connect GitHub</button>
          )}
          {profile.githubLogin && <span className="ok">@{profile.githubLogin}</span>}
        </div>

        {github?.status === 'pending' && (
          <p className="dim">
            Go to <a href={github.verificationUri} target="_blank" rel="noreferrer">{github.verificationUri}</a> and enter <b>{github.userCode}</b>
          </p>
        )}
        {github?.status === 'error' && <p className="danger">{github.message}</p>}

        <button className="btn btn-ghost mute-btn" onClick={onMute}>{muted ? '🔇 muted' : '🔊 sound'}</button>
      </div>
    </Center>
  )
}

// ——— in-run HUD ———

function Hud({ hud, muted, onMute }: { hud: HudState; muted: boolean; onMute: () => void }) {
  return (
    <>
      <div className="hud hud-tl">
        <span className="hearts">{'❤'.repeat(hud.hp)}{'🖤'.repeat(Math.max(0, 3 - hud.hp))}</span>
        <span className="gold score">{hud.score}</span>
        {hud.streak > 1 && <span className="streak">🔥 ×{hud.multiplier.toFixed(2)}</span>}
      </div>
      <div className="hud hud-tr">
        <span>💎 {hud.gems}/{hud.gemsTotal}</span>
        <span>🏛 {hud.found}/{hud.total}</span>
        <button className="btn btn-ghost mute-btn" onClick={onMute}>{muted ? '🔇' : '🔊'}</button>
      </div>
    </>
  )
}

// ——— shrine challenge modal ———

function ChallengeModal({ challenge, result, onAnswer }: {
  challenge: ChallengeView
  result: { correct: boolean; fact: string; url: string; repoName: string } | null
  onAnswer: (i: number) => void
}) {
  return (
    <Center>
      <div className={`panel challenge-panel ${result ? (result.correct ? 'result-ok' : 'result-no') : ''}`}>
        <p className="dim small">ancient shrine · answer to unearth the gem</p>
        <h3 className="prompt">{challenge.prompt}</h3>
        {!result && (
          <div className={`options ${challenge.options.length <= 2 ? 'two' : 'grid'}`}>
            {challenge.options.map((opt, i) => (
              <button key={i} className="btn option" onClick={() => onAnswer(i)}>{opt}</button>
            ))}
          </div>
        )}
        {!result && <p className="dim hint">🔍 {challenge.hint}</p>}

        {result && (
          <div className="result">
            <p className={`verdict ${result.correct ? 'ok' : 'danger'}`}>
              {result.correct ? '✓ Correct — the gem is yours!' : '✗ Not quite…'}
            </p>
            <p className="fact">{result.fact}</p>
            <div className="result-actions">
              <a className="btn btn-primary" href={result.url} target="_blank" rel="noreferrer">
                ★ Open {result.repoName} on GitHub
              </a>
              <button className="btn" onClick={() => bus.emit('action', 'resume')}>Keep exploring</button>
            </div>
            <p className="dim small">Stars are hype — visiting, forking and starring real low-star repos is the whole quest.</p>
          </div>
        )}
      </div>
    </Center>
  )
}

// ——— end screens ———

function EndScreen({ summary, win, profile, onRestart }: {
  summary: RunSummary; win: boolean; profile: Profile; onRestart: () => void
}) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(shareText(summary, profile.handle))
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch { /* clipboard blocked — the download card still works */ }
  }

  return (
    <Center>
      <div className="panel end-panel">
        <h2 className={win ? 'ok' : 'danger'}>{win ? 'VAULT CLEARED! 🏆' : 'THE BUGS GOT YOU… 🐛'}</h2>
        {summary.newBest && <p className="gold">New best score!</p>}

        <div className="stats-row">
          <Stat label="SCORE" value={summary.score} cls="gold" />
          <Stat label="REPOS" value={`${summary.found}/${summary.total}`} cls="ok" />
          <Stat label="GEMS" value={`${summary.gems}/${summary.gemsTotal}`} cls="cyan" />
          <Stat label="STREAK" value={`×${summary.bestStreak}`} cls="pink" />
        </div>

        {summary.badges.length > 0 && (
          <p className="badges">{summary.badges.map((b) => <span key={b} className="badge">{b}</span>)}</p>
        )}

        <p className="dim small unearthed">— UNEARTHED · give them a star —</p>
        <ul className="found-list">
          {summary.discovered.map((d) => (
            <li key={`${d.owner}/${d.name}`}>
              <a href={d.url} target="_blank" rel="noreferrer">{d.owner}/{d.name}</a>
              <span className={`tier tier-${d.tier.replace(' ', '-')}`}>{d.tier}</span>
            </li>
          ))}
        </ul>

        <div className="result-actions">
          <button className="btn" onClick={() => void copy()}>{copied ? '✓ copied' : 'Copy share text'}</button>
          <button className="btn" onClick={() => void downloadShareCard(summary, profile.handle)}>Download card PNG</button>
          <button className="btn btn-primary" onClick={onRestart}>Delve again ⚔</button>
        </div>
      </div>
    </Center>
  )
}

function Stat({ label, value, cls }: { label: string; value: string | number; cls: string }) {
  return (
    <div className="stat">
      <span className="stat-label">{label}</span>
      <span className={`stat-value ${cls}`}>{value}</span>
    </div>
  )
}
