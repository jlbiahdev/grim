// Seuls les liens https quittent l'application vers le navigateur du système.
// Les autres schémas (file:, javascript:, protocoles personnalisés…) pourraient
// lancer un programme local : on les refuse.
export function isSafeExternalUrl(url: string): boolean {
  try {
    return new URL(url).protocol === 'https:'
  } catch {
    return false
  }
}
