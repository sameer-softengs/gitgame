import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// HashRouter (not BrowserRouter): the game is a single static page deployed to
// GitHub Pages at a project subpath (e.g. /gitgame/). Hash routing needs no
// server-side base config, so every route resolves no matter where it's hosted.
import { HashRouter } from 'react-router'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </StrictMode>,
)
