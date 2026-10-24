// Transitions de l'état des projets affichés, sans React : testables seules.
import { GitHubNetworkError } from '../github/GitHubClient.ts'
import type { LoadProjectsResult } from '../github/loadProjects.ts'

// Résultat rattaché au token qui l'a produit : après un changement de token,
// les projets de l'ancien ne doivent jamais s'afficher, même un instant.
export interface ProjectsState {
  token: string
  refreshing: boolean
  result: LoadProjectsResult | null
  error: unknown
}

export interface ProjectsView {
  loading: boolean
  result: LoadProjectsResult | null
  error: unknown
}

// Sans état pour le token courant (premier chargement, nouveau token), l'écran
// est « en lecture ».
export function projectsView(state: ProjectsState | null, token: string | null): ProjectsView {
  const current = token !== null && state?.token === token ? state : null
  return {
    loading: current === null || current.refreshing,
    result: current?.result ?? null,
    error: current?.error ?? null,
  }
}

// Pendant une actualisation, les projets déjà affichés restent visibles.
export function refreshingState(previous: ProjectsState | null, token: string): ProjectsState | null {
  return previous?.token === token ? { ...previous, refreshing: true, error: null } : previous
}

export function loadedState(token: string, result: LoadProjectsResult): ProjectsState {
  return { token, refreshing: false, result, error: null }
}

// Après une coupure réseau, les projets déjà lus restent affichés sous l'alerte :
// ils sont peut-être un peu anciens, mais pas faux. Toute autre erreur (token
// refusé, droits, limite) les retire.
export function failedState(previous: ProjectsState | null, token: string, error: unknown): ProjectsState {
  const keepsPreviousResult = error instanceof GitHubNetworkError && previous?.token === token
  return { token, refreshing: false, result: keepsPreviousResult ? previous.result : null, error }
}
