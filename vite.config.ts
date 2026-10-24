import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

// Politique de sécurité du contenu, ajoutée seulement au build : en développement,
// Vite injecte des scripts en ligne (rechargement à chaud) qu'elle bloquerait.
// api.github.com est la seule origine externe que l'interface a le droit d'appeler.
const CONTENT_SECURITY_POLICY =
  "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self' https://api.github.com"

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
  // Chemins relatifs : Electron charge le build depuis le disque (file://).
  base: './',
  plugins: [react(), contentSecurityPolicy()],
})
