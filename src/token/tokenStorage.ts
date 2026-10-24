// Le token GitHub est gardé dans localStorage, de la même façon dans Electron et
// dans la future PWA (décision du projet : token fine-grained en lecture seule).
// Le nom de la clé est fixe : il ne contient jamais le token lui-même.
export const TOKEN_STORAGE_KEY = 'grim.github-token'

// Sous-ensemble de l'API Storage : permet de tester sans navigateur.
export type TokenStore = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>

// Les tokens GitHub (classiques « ghp_… » ou fine-grained « github_pat_… »)
// n'ont que des lettres, chiffres et « _ ». Un caractère collé par erreur
// (espace invisible, « … », lettre accentuée) ferait échouer chaque requête
// avec une erreur trompeuse, prise pour une coupure réseau.
const TOKEN_FORMAT = /^[A-Za-z0-9_]+$/

export function isValidTokenFormat(token: string): boolean {
  return TOKEN_FORMAT.test(token)
}

// Lecture impossible (stockage interdit) ou valeur invalide : on fait comme
// s'il n'y avait pas de token, l'utilisateur le saisira à nouveau.
export function readToken(store: TokenStore): string | null {
  try {
    const token = store.getItem(TOKEN_STORAGE_KEY)?.trim()
    return token && isValidTokenFormat(token) ? token : null
  } catch {
    return null
  }
}

// Renvoie false si l'écriture échoue (stockage plein ou interdit) : l'appelant
// doit le dire, sinon le token serait perdu au prochain lancement sans prévenir.
export function saveToken(store: TokenStore, token: string): boolean {
  try {
    store.setItem(TOKEN_STORAGE_KEY, token)
    return true
  } catch {
    return false
  }
}

// Renvoie false si l'effacement échoue : le token resterait sur la machine.
export function clearToken(store: TokenStore): boolean {
  try {
    store.removeItem(TOKEN_STORAGE_KEY)
    return true
  } catch {
    return false
  }
}
