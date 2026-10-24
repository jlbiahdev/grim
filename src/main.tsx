import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// Police Jura (signature de Bitojel), embarquée dans l'application : la CSP
// interdit Google Fonts et l'application doit s'afficher hors connexion.
// Sous-ensemble latin seulement : il couvre les accents du français ; les rares
// caractères absents (Ÿ, espace fine insécable) viennent de la police système.
import '@fontsource/jura/latin-400.css'
import '@fontsource/jura/latin-600.css'
import '@fontsource/jura/latin-700.css'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
