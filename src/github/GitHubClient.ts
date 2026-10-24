// Accès en lecture à l'API REST de GitHub. Les appels partent de l'interface :
// le même code tourne dans Electron et dans un navigateur (future PWA).

const API_ORIGIN = 'https://api.github.com'
const API_VERSION = '2022-11-28'
const JSON_MEDIA_TYPE = 'application/vnd.github+json'
const RAW_MEDIA_TYPE = 'application/vnd.github.raw+json'
const SUMMARY_FILE = 'summary.md'
const REPOSITORIES_PER_PAGE = 100
// Garde-fou contre une pagination qui ne se terminerait pas : 1 000 dépôts.
const MAX_REPOSITORY_PAGES = 10
// Assez pour trouver une activité utile derrière quelques suppressions de branches.
const ACTIVITIES_PER_PAGE = 10

export type FetchFunction = (input: string, init: RequestInit) => Promise<Response>

export interface Repository {
  name: string
  fullName: string
  htmlUrl: string
  defaultBranch: string
}

// Le serveur a répondu, mais par un refus ou une erreur (401, 403, 404, 5xx…).
export class GitHubHttpError extends Error {
  readonly status: number
  // Limite de débit atteinte : elle vaut pour tous les dépôts, pas pour un seul.
  readonly rateLimited: boolean

  constructor(status: number, url: string, rateLimited: boolean) {
    super(`GitHub a répondu ${status} pour ${url}`)
    this.name = 'GitHubHttpError'
    this.status = status
    this.rateLimited = rateLimited
  }
}

// La requête n'a pas abouti ou sa réponse est inexploitable : pas de réseau,
// DNS, CORS, coupure pendant la lecture, contenu illisible.
export class GitHubNetworkError extends Error {
  constructor(url: string, cause: unknown) {
    super(`GitHub injoignable pour ${url}`, { cause })
    this.name = 'GitHubNetworkError'
  }
}

export class GitHubClient {
  private readonly token: string
  private readonly fetchFunction: FetchFunction

  // Par défaut, une fonction qui enveloppe fetch : appelé comme méthode d'un
  // autre objet, le fetch du navigateur lève « Illegal invocation ».
  constructor(token: string, fetchFunction: FetchFunction = (input, init) => fetch(input, init)) {
    this.token = token
    this.fetchFunction = fetchFunction
  }

  // Au-delà de MAX_REPOSITORY_PAGES pages, la liste est tronquée (plus de 1 000 dépôts).
  async listOwnedRepositories(): Promise<Repository[]> {
    const repositories: Repository[] = []
    let url: string | null =
      `${API_ORIGIN}/user/repos?affiliation=owner&sort=pushed&per_page=${REPOSITORIES_PER_PAGE}`

    for (let page = 0; url && page < MAX_REPOSITORY_PAGES; page++) {
      const response = await this.request(url, JSON_MEDIA_TYPE)
      repositories.push(...toRepositories(await readBody(response, url, 'json')))
      url = nextPageUrl(response.headers.get('Link'))
    }
    return repositories
  }

  // La dernière branche modifiée, d'après le journal d'activité du dépôt. Tous
  // les types comptent (push, merge de PR, création…) : un merge n'est pas un
  // push, et l'ignorer ferait lire une branche de travail déjà mergée.
  async findLatestActiveBranch(fullName: string): Promise<string | null> {
    const url = `${API_ORIGIN}/repos/${encodeFullName(fullName)}/activity?per_page=${ACTIVITIES_PER_PAGE}`
    const response = await this.requestOrNullIfMissing(url, JSON_MEDIA_TYPE)
    return response ? toBranchName(await readBody(response, url, 'json')) : null
  }

  async fetchSummaryFile(fullName: string, branch: string): Promise<string | null> {
    const url = `${API_ORIGIN}/repos/${encodeFullName(fullName)}/contents/${SUMMARY_FILE}?ref=${encodeURIComponent(branch)}`
    const response = await this.requestOrNullIfMissing(url, RAW_MEDIA_TYPE)
    return response ? readBody(response, url, 'text') : null
  }

  // 404 : fichier, branche ou dépôt introuvable. 409 : dépôt vide, sans aucun
  // commit. Dans les deux cas il n'y a simplement rien à lire.
  private async requestOrNullIfMissing(url: string, accept: string): Promise<Response | null> {
    try {
      return await this.request(url, accept)
    } catch (error) {
      if (error instanceof GitHubHttpError && (error.status === 404 || error.status === 409)) {
        return null
      }
      throw error
    }
  }

  private async request(url: string, accept: string): Promise<Response> {
    let response: Response
    try {
      response = await this.fetchFunction(url, {
        headers: {
          Accept: accept,
          Authorization: `Bearer ${this.token}`,
          'X-GitHub-Api-Version': API_VERSION,
        },
      })
    } catch (error) {
      throw new GitHubNetworkError(url, error)
    }

    if (!response.ok) {
      throw new GitHubHttpError(response.status, url, isRateLimited(response))
    }
    return response
  }
}

// GitHub signale une limite de débit par un 429, ou par un 403 accompagné d'un
// quota restant à zéro ou d'un délai d'attente.
function isRateLimited(response: Response): boolean {
  const headers = response.headers
  return (
    response.status === 429 ||
    (response.status === 403 &&
      (headers.get('x-ratelimit-remaining') === '0' || headers.get('retry-after') !== null))
  )
}

// La lecture du corps peut échouer après les en-têtes (coupure, JSON invalide) :
// on la range dans les erreurs réseau pour que l'appelant n'ait que deux cas.
async function readBody(response: Response, url: string, format: 'json'): Promise<unknown>
async function readBody(response: Response, url: string, format: 'text'): Promise<string>
async function readBody(response: Response, url: string, format: 'json' | 'text'): Promise<unknown> {
  try {
    return format === 'json' ? await response.json() : await response.text()
  } catch (error) {
    throw new GitHubNetworkError(url, error)
  }
}

function encodeFullName(fullName: string): string {
  return fullName.split('/').map(encodeURIComponent).join('/')
}

// Les données viennent du réseau : on ne garde que les entrées bien formées.
// html_url sera ouvert dans le navigateur : on n'accepte qu'une page github.com.
// Les forks sont écartés : leur summary.md éventuel est celui d'un autre projet.
// Les dépôts archivés restent : leur statut indique s'ils sont terminés.
function toRepositories(data: unknown): Repository[] {
  if (!Array.isArray(data)) {
    return []
  }
  return data.flatMap((item: unknown) => {
    if (!isRecord(item) || item.fork === true) {
      return []
    }
    const { name, full_name, html_url, default_branch } = item
    const isWellFormed =
      typeof name === 'string' &&
      typeof full_name === 'string' &&
      typeof html_url === 'string' &&
      html_url.startsWith('https://github.com/') &&
      typeof default_branch === 'string'
    return isWellFormed ? [{ name, fullName: full_name, htmlUrl: html_url, defaultBranch: default_branch }] : []
  })
}

// Activités les plus récentes d'abord. Une branche supprimée n'a plus de
// summary.md à lire : on écarte sa suppression et toutes ses activités plus
// anciennes, pour retenir la branche active suivante.
function toBranchName(data: unknown): string | null {
  const branchPrefix = 'refs/heads/'
  const deletedRefs = new Set<string>()
  const activities: unknown[] = Array.isArray(data) ? data : []

  for (const activity of activities) {
    if (!isRecord(activity) || typeof activity.ref !== 'string' || !activity.ref.startsWith(branchPrefix)) {
      continue
    }
    if (activity.activity_type === 'branch_deletion') {
      deletedRefs.add(activity.ref)
    } else if (!deletedRefs.has(activity.ref)) {
      return activity.ref.slice(branchPrefix.length)
    }
  }
  return null
}

// En-tête Link : <https://api.github.com/...&page=2>; rel="next", <...>; rel="last".
// On ne suit qu'une URL de l'API GitHub, jamais une autre origine.
function nextPageUrl(linkHeader: string | null): string | null {
  const next = linkHeader
    ?.split(',')
    .map((part) => /<([^>]+)>\s*;\s*rel="next"/.exec(part)?.[1])
    .find((url) => url !== undefined)
  return next?.startsWith(`${API_ORIGIN}/`) ? next : null
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}
