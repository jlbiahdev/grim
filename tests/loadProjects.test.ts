import { test } from 'node:test'
import assert from 'node:assert/strict'
import { GitHubClient, GitHubHttpError, GitHubNetworkError } from '../src/github/GitHubClient.ts'
import { loadProjects, mapWithConcurrency } from '../src/github/loadProjects.ts'
import { REPOS_URL, activityUrl, fakeGitHub, pushedTo, repository, summaryUrl } from './fakeGitHub.ts'

const SUMMARY = '---\nstatus: en cours\n---\n## Attentes\n- A\n'

test('lit summary.md sur la dernière branche active', async () => {
  const github = fakeGitHub({
    [REPOS_URL]: { json: [repository('alpha')] },
    [activityUrl('alpha')]: pushedTo('feat/x'),
    [summaryUrl('alpha', 'feat/x')]: { text: SUMMARY },
  })
  const { projects } = await loadProjects(new GitHubClient('t', github.fetch))

  assert.equal(projects[0].branch, 'feat/x')
  assert.equal(projects[0].summary.status, 'en cours')
})

test('se rabat sur la branche par défaut quand la dernière branche n’a pas le fichier', async () => {
  const github = fakeGitHub({
    [REPOS_URL]: { json: [repository('alpha')] },
    [activityUrl('alpha')]: pushedTo('review/code-complet'),
    [summaryUrl('alpha', 'main')]: { text: SUMMARY },
  })
  const { projects } = await loadProjects(new GitHubClient('t', github.fetch))

  assert.equal(projects[0].branch, 'main')
})

test('lit la branche par défaut quand le dépôt n’a pas d’activité', async () => {
  const github = fakeGitHub({
    [REPOS_URL]: { json: [repository('alpha')] },
    [activityUrl('alpha')]: { json: [] },
    [summaryUrl('alpha', 'main')]: { text: SUMMARY },
  })
  const { projects } = await loadProjects(new GitHubClient('t', github.fetch))

  assert.equal(projects[0].branch, 'main')
})

test('ne lit qu’une fois la branche par défaut quand c’est la dernière poussée', async () => {
  const github = fakeGitHub({
    [REPOS_URL]: { json: [repository('alpha')] },
    [activityUrl('alpha')]: pushedTo('main'),
  })
  await loadProjects(new GitHubClient('t', github.fetch))

  const summaryRequests = github.requests.filter((r) => r.url.includes('/contents/'))
  assert.equal(summaryRequests.length, 1)
})

test('écarte un dépôt sans summary.md', async () => {
  const github = fakeGitHub({ [REPOS_URL]: { json: [repository('alpha')] } })
  const result = await loadProjects(new GitHubClient('t', github.fetch))

  assert.deepEqual(result, { projects: [], failedRepositories: [] })
})

test('garde l’ordre des dépôts renvoyé par GitHub', async () => {
  const names = ['alpha', 'beta', 'gamma', 'delta', 'epsilon', 'zeta']
  const routes = Object.fromEntries(names.map((name) => [summaryUrl(name, 'main'), { text: SUMMARY }]))
  const github = fakeGitHub({ [REPOS_URL]: { json: names.map((name) => repository(name)) }, ...routes })
  const { projects } = await loadProjects(new GitHubClient('t', github.fetch))

  assert.deepEqual(
    projects.map((p) => p.repository.name),
    names,
  )
})

test('liste à part un dépôt en échec et affiche les autres', async () => {
  const github = fakeGitHub({
    [REPOS_URL]: { json: [repository('alpha'), repository('beta')] },
    [summaryUrl('alpha', 'main')]: { status: 500 },
    [summaryUrl('beta', 'main')]: { text: SUMMARY },
  })
  const result = await loadProjects(new GitHubClient('t', github.fetch))

  assert.deepEqual(result.failedRepositories, ['jl/alpha'])
  assert.deepEqual(
    result.projects.map((p) => p.repository.name),
    ['beta'],
  )
})

test('liste à part un dépôt injoignable', async () => {
  const github = fakeGitHub({
    [REPOS_URL]: { json: [repository('alpha')] },
    [activityUrl('alpha')]: { networkError: true },
  })
  const result = await loadProjects(new GitHubClient('t', github.fetch))

  assert.deepEqual(result.failedRepositories, ['jl/alpha'])
})

test('signale un token refusé en cours de lecture', async () => {
  const github = fakeGitHub({
    [REPOS_URL]: { json: [repository('alpha'), repository('beta')] },
    [activityUrl('beta')]: { status: 401 },
  })
  await assert.rejects(loadProjects(new GitHubClient('t', github.fetch)), (error) => {
    return error instanceof GitHubHttpError && error.status === 401
  })
})

test('cesse de demander les dépôts suivants dès que le token est refusé', async () => {
  const names = Array.from({ length: 20 }, (_, index) => `depot-${index}`)
  const refusals = Object.fromEntries(names.map((name) => [activityUrl(name), { status: 401 }]))
  const github = fakeGitHub({ [REPOS_URL]: { json: names.map((name) => repository(name)) }, ...refusals })
  await assert.rejects(loadProjects(new GitHubClient('t', github.fetch)))

  // La liste, puis au plus une requête par lecture déjà en cours (4 en parallèle).
  assert.ok(github.requests.length <= 5, `${github.requests.length} requêtes`)
})

test('signale une limite de débit au lieu de marquer chaque dépôt en échec', async () => {
  const github = fakeGitHub({
    [REPOS_URL]: { json: [repository('alpha'), repository('beta')] },
    [activityUrl('alpha')]: { status: 429 },
  })
  await assert.rejects(loadProjects(new GitHubClient('t', github.fetch)), (error) => {
    return error instanceof GitHubHttpError && error.rateLimited
  })
})

test('marque le dépôt en échec sans repli quand la dernière branche répond en erreur', async () => {
  const github = fakeGitHub({
    [REPOS_URL]: { json: [repository('alpha')] },
    [activityUrl('alpha')]: pushedTo('feat/x'),
    [summaryUrl('alpha', 'feat/x')]: { status: 500 },
    [summaryUrl('alpha', 'main')]: { text: SUMMARY },
  })
  const result = await loadProjects(new GitHubClient('t', github.fetch))

  assert.deepEqual(result, { projects: [], failedRepositories: ['jl/alpha'] })
})

test('propage l’échec de la liste des dépôts', async () => {
  const github = fakeGitHub({ [REPOS_URL]: { networkError: true } })
  await assert.rejects(loadProjects(new GitHubClient('t', github.fetch)), GitHubNetworkError)
})

test('ne dépasse jamais la limite de tâches en parallèle', async () => {
  let running = 0
  let maxRunning = 0
  await mapWithConcurrency([1, 2, 3, 4, 5, 6, 7], 3, async () => {
    running++
    maxRunning = Math.max(maxRunning, running)
    await Promise.resolve()
    running--
  })

  assert.equal(maxRunning, 3)
})

test('renvoie les résultats dans l’ordre des éléments même s’ils finissent dans le désordre', async () => {
  const releases: Record<string, () => void> = {}
  const pending = mapWithConcurrency(['a', 'b', 'c'], 3, (item) => {
    return new Promise<string>((resolve) => {
      releases[item] = () => resolve(item.toUpperCase())
    })
  })
  releases.c()
  releases.a()
  releases.b()

  assert.deepEqual(await pending, ['A', 'B', 'C'])
})
