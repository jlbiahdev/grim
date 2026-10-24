// Garde contre les réponses périmées : seule la dernière demande lancée compte.
// Une demande dépassée (token changé ou oublié, « Actualiser » recliqué, écran
// fermé) est aussi interrompue : ses requêtes cessent au lieu de continuer à
// utiliser un ancien token et à consommer le quota GitHub.
export interface LatestRequest {
  // Dit si la demande est toujours la dernière au moment où son résultat arrive.
  isLatest: () => boolean
  // À passer à fetch : déclenché quand la demande est dépassée.
  signal: AbortSignal
}

export interface LatestOnly {
  start(): LatestRequest
  cancelAll(): void
}

export function createLatestOnly(): LatestOnly {
  let currentRequest = 0
  let currentController: AbortController | null = null

  function abortCurrent() {
    currentRequest++
    currentController?.abort()
    currentController = null
  }

  return {
    start() {
      abortCurrent()
      const request = currentRequest
      const controller = new AbortController()
      currentController = controller
      return { isLatest: () => request === currentRequest, signal: controller.signal }
    },
    cancelAll: abortCurrent,
  }
}
