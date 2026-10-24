import { parseSummary, type ProjectSummary } from '../summary/parseSummary.ts'
import { GitHubHttpError, type GitHubClient, type Repository } from './GitHubClient.ts'

export interface Project {
  repository: Repository
  // Branche sur laquelle summary.md a été lu.
  branch: string
  summary: ProjectSummary
}

export interface LoadProjectsResult {
  // Dans l'ordre des dépôts, du plus récemment poussé au plus ancien.
  projects: Project[]
  // Dépôts dont la lecture a échoué : les autres restent affichés.
  failedRepositories: string[]
}

// GitHub recommande de limiter les requêtes parallèles pour éviter ses limites
// de débit secondaires : quelques dépôts à la fois suffisent.
const MAX_PARALLEL_REPOSITORIES = 4

type RepositoryOutcome = { ok: true; project: Project | null } | { ok: false; error: unknown }

export async function loadProjects(client: GitHubClient): Promise<LoadProjectsResult> {
  const repositories = await client.listOwnedRepositories()

  // Une erreur qui touche tous les dépôts (token refusé, limite de débit) arrête
  // la lecture : les dépôts pas encore commencés ne sont plus demandés.
  let globalError: unknown = null
  const outcomes = await mapWithConcurrency(repositories, MAX_PARALLEL_REPOSITORIES, async (repository) => {
    if (globalError) {
      return null
    }
    const outcome = await readRepository(client, repository)
    if (!outcome.ok && isGlobalError(outcome.error)) {
      globalError ??= outcome.error
    }
    return outcome
  })
  if (globalError) {
    throw globalError
  }

  const projects: Project[] = []
  const failedRepositories: string[] = []
  outcomes.forEach((outcome, index) => {
    if (outcome && !outcome.ok) {
      failedRepositories.push(repositories[index].fullName)
    } else if (outcome?.project) {
      projects.push(outcome.project)
    }
  })
  return { projects, failedRepositories }
}

async function readRepository(client: GitHubClient, repository: Repository): Promise<RepositoryOutcome> {
  try {
    return { ok: true, project: await loadProject(client, repository) }
  } catch (error) {
    return { ok: false, error }
  }
}

// Lit summary.md sur la dernière branche active, sinon sur la branche par
// défaut (branche qui n'a pas le fichier). Une erreur sur la dernière branche
// fait échouer le dépôt sans repli : afficher l'ancien résumé de la branche par
// défaut ferait passer une information périmée pour la dernière.
// Un dépôt sans summary.md donne null : il n'apparaît pas dans la grille.
async function loadProject(client: GitHubClient, repository: Repository): Promise<Project | null> {
  const latestBranch = await client.findLatestActiveBranch(repository.fullName)
  const candidateBranches =
    latestBranch && latestBranch !== repository.defaultBranch
      ? [latestBranch, repository.defaultBranch]
      : [repository.defaultBranch]

  for (const branch of candidateBranches) {
    const content = await client.fetchSummaryFile(repository.fullName, branch)
    if (content !== null) {
      return { repository, branch, summary: parseSummary(content) }
    }
  }
  return null
}

function isGlobalError(error: unknown): boolean {
  return error instanceof GitHubHttpError && (error.status === 401 || error.rateLimited)
}

// Applique `task` à chaque élément avec au plus `limit` tâches en cours à la
// fois (limit ≥ 1) ; les résultats gardent l'ordre des éléments. `task` ne doit
// pas lever d'erreur : les appelants renvoient leurs échecs comme des valeurs.
export async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  task: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array<R>(items.length)
  let nextIndex = 0

  async function worker(): Promise<void> {
    while (nextIndex < items.length) {
      const index = nextIndex++
      results[index] = await task(items[index])
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker))
  return results
}
