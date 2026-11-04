import { registerSW } from 'virtual:pwa-register'
import { canUseServiceWorker } from './serviceWorkerSupport.ts'

export function registerServiceWorker(): void {
  if (!canUseServiceWorker(window.location.protocol, 'serviceWorker' in navigator)) {
    return
  }
  registerSW({
    immediate: true,
    // Une nouvelle version s'installe en arrière-plan et s'applique à la
    // prochaine ouverture. Le rechargement automatique (comportement par défaut)
    // effacerait un token en cours de saisie ou gardé en mémoire, sans prévenir.
    onNeedReload: () => {},
    // L'application marche sans service worker (simplement sans lancement hors
    // connexion) : un échec est signalé dans la console, sans gêner l'utilisateur.
    onRegisterError: (error) => console.warn('Service worker non enregistré :', error),
  })
}
