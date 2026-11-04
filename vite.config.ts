import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// Politique de sécurité du contenu, ajoutée seulement au build : en développement,
// Vite injecte des scripts en ligne (rechargement à chaud) qu'elle bloquerait.
// api.github.com est la seule origine externe que l'interface a le droit d'appeler.
const CONTENT_SECURITY_POLICY =
  "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self' https://api.github.com"

// Couleur de fond de l'application (--bg-page dans index.css) : barre d'état et
// écran de lancement de la PWA, pour éviter un flash blanc.
const PAGE_BACKGROUND = '#090e1a'

function contentSecurityPolicy(): Plugin {
  return {
    name: 'content-security-policy',
    apply: 'build',
    transformIndexHtml: () => [
      {
        tag: 'meta',
        attrs: { 'http-equiv': 'Content-Security-Policy', content: CONTENT_SECURITY_POLICY },
        injectTo: 'head-prepend',
      },
    ],
  }
}

export default defineConfig({
  // Chemins relatifs : Electron charge le build depuis le disque (file://), et la
  // PWA est servie à la racine du site, où ces chemins fonctionnent aussi.
  base: './',
  plugins: [
    react(),
    contentSecurityPolicy(),
    // Le service worker ne met en cache que l'application elle-même (lancement
    // hors connexion). Aucune règle de cache à l'exécution : les réponses de
    // GitHub, qui contiennent des données privées, n'y passent jamais.
    VitePWA({
      // Enregistrement fait à la main dans main.tsx, seulement en https :
      // un service worker ne peut pas tourner dans Electron (file://).
      injectRegister: false,
      registerType: 'autoUpdate',
      manifest: {
        name: 'GRIM — GitHub Repo AI Monitor',
        short_name: 'GRIM',
        description: 'Vos projets GitHub en un coup d’œil, à partir du summary.md de chaque dépôt.',
        lang: 'fr',
        theme_color: PAGE_BACKGROUND,
        background_color: PAGE_BACKGROUND,
        display: 'standalone',
        start_url: './',
        scope: './',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,svg,woff2}'],
        skipWaiting: true,
        clientsClaim: true,
        // L'application tient en une page : pas de repli de navigation. Servir
        // index.html pour /foo/bar casserait ses chemins relatifs (page blanche) ;
        // sans repli, Vercel renvoie un 404 propre.
        navigateFallback: null,
      },
    }),
  ],
})
