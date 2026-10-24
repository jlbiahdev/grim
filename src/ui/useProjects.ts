import { useCallback, useEffect, useState } from 'react'
import { GitHubClient } from '../github/GitHubClient.ts'
import { loadProjects } from '../github/loadProjects.ts'
import { createLatestOnly } from './latestOnly.ts'
import {
  failedState,
  loadedState,
  projectsView,
  refreshingState,
  type ProjectsState,
  type ProjectsView,
} from './projectsState.ts'

export interface UseProjects extends ProjectsView {
  refresh: () => void
  // À appeler quand le token est oublié : un même token ressaisi ensuite repart
  // d'un écran « en lecture » au lieu de réafficher l'ancien résultat.
  reset: () => void
}

export function useProjects(token: string | null): UseProjects {
  const [state, setState] = useState<ProjectsState | null>(null)
  const [latestOnly] = useState(createLatestOnly)

  // Ne modifie l'état qu'à l'arrivée du résultat, et seulement s'il répond
  // encore à la dernière demande.
  const fetchProjects = useCallback(
    (currentToken: string) => {
      const { isLatest, signal } = latestOnly.start()
      const client = new GitHubClient(currentToken, (input, init) => fetch(input, { ...init, signal }))
      loadProjects(client).then(
        (result) => {
          if (isLatest()) {
            setState(loadedState(currentToken, result))
          }
        },
        (error: unknown) => {
          if (isLatest()) {
            setState((previous) => failedState(previous, currentToken, error))
          }
        },
      )
    },
    [latestOnly],
  )

  useEffect(() => {
    if (token) {
      fetchProjects(token)
    }
    // Token retiré ou changé, écran fermé : les chargements en cours sont interrompus.
    return () => latestOnly.cancelAll()
  }, [token, fetchProjects, latestOnly])

  const refresh = useCallback(() => {
    if (token) {
      setState((previous) => refreshingState(previous, token))
      fetchProjects(token)
    }
  }, [token, fetchProjects])

  const reset = useCallback(() => {
    latestOnly.cancelAll()
    setState(null)
  }, [latestOnly])

  return { ...projectsView(state, token), refresh, reset }
}
