// Faux serveur GitHub pour les tests : associe une URL (sans l'origine) à une
// réponse. Toute URL non prévue répond 404, comme un fichier absent.
import type { FetchFunction } from '../src/github/GitHubClient.ts'

export interface FakeRoute {
  status?: number
  json?: unknown
  text?: string
  headers?: Record<string, string>
  networkError?: boolean
}

export interface FakeGitHub {
  fetch: FetchFunction
  requests: { url: string; init: RequestInit }[]
}

export function fakeGitHub(routes: Record<string, FakeRoute>): FakeGitHub {
  const requests: { url: string; init: RequestInit }[] = []

  const fetch: FetchFunction = async (url, init) => {
    requests.push({ url, init })
    const route = routes[url.replace('https://api.github.com', '')]
    if (route?.networkError) {
      throw new TypeError('Failed to fetch')
    }
    if (!route) {
      return new Response('Not Found', { status: 404 })
    }
    const body = route.json !== undefined ? JSON.stringify(route.json) : (route.text ?? '')
    return new Response(body, { status: route.status ?? 200, headers: route.headers })
  }

  return { fetch, requests }
}

export function repository(name: string, defaultBranch = 'main') {
  return {
    name,
    full_name: `jl/${name}`,
    html_url: `https://github.com/jl/${name}`,
    default_branch: defaultBranch,
  }
}

export const REPOS_URL = '/user/repos?affiliation=owner&sort=pushed&per_page=100'

export function activityUrl(name: string): string {
  return `/repos/jl/${name}/activity?per_page=10`
}

export function summaryUrl(name: string, branch: string): string {
  return `/repos/jl/${name}/contents/summary.md?ref=${encodeURIComponent(branch)}`
}

export function pushedTo(branch: string) {
  return { json: [{ activity_type: 'push', ref: `refs/heads/${branch}` }] }
}
