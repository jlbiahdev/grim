import { clearToken, saveToken, type TokenStore } from '../token/tokenStorage.ts'

export const SESSION_ONLY_NOTICE =
  'Le token n’a pas pu être enregistré sur cet appareil (stockage plein ou interdit)\u00a0: il est gardé pour cette session seulement et sera redemandé à la prochaine ouverture.'

export const CLEAR_FAILED_NOTICE =
  'Le token n’a pas pu être effacé\u00a0: il est peut-être encore enregistré sur cet appareil.'

// Un stockage refusé ne bloque pas l'application : le token reste utilisable en
// mémoire (sessionOnly), et l'écran principal le signale.
export function rememberToken(store: TokenStore, token: string): { sessionOnly: boolean } {
  return { sessionOnly: !saveToken(store, token) }
}

// Message à afficher après « Oublier le token ». Un échec d'effacement est
// toujours signalé, même si le dernier token n'avait pas pu être enregistré :
// un token plus ancien peut rester dans le stockage.
export function forgetToken(store: TokenStore, reason: string | null): string | null {
  const cleared = clearToken(store)
  const notices = [reason, cleared ? null : CLEAR_FAILED_NOTICE].filter((notice) => notice !== null)
  return notices.length > 0 ? notices.join(' ') : null
}
