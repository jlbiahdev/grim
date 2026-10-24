import { test } from 'node:test'
import assert from 'node:assert/strict'
import { GitHubClient, GitHubHttpError, GitHubNetworkError } from '../src/github/GitHubClient.ts'
import { REPOS_URL, activityUrl, fakeGitHub, pushedTo, repository, summaryUrl } from './fakeGitHub.ts'

test('envoie le token et la version d’API à GitHub', async () => {
  const github = fakeGitHub({ [REPOS_URL]: { json: [] } })
  await new GitHubClient('secret', github.fetch).listOwnedRepositories()

  const headers = github.requests[0].init.headers as Record<string, string>
  assert.equal(headers.Authorization, 'Bearer secret')
  assert.equal(headers['X-GitHub-Api-Version'], '2022-11-28')
})

test('liste les dépôts possédés', async () => {
  const github = fakeGitHub({ [REPOS_URL]: { json: [repository('alpha', 'develop')] } })
  const repositories = await new GitHubClient('t', github.fetch).listOwnedRepositories()

  assert.deepEqual(repositories, [
    { name: 'alpha', fullName: 'jl/alpha', htmlUrl: 'https://github.com/jl/alpha', defaultBranch: 'develop' },
  ])
})

test('suit la pagination des dépôts', async () => {
  const page2 = '/user/repos?affiliation=owner&sort=pushed&per_page=100&page=2'
  const github = fakeGitHub({
    [REPOS_URL]: {
      json: [repository('alpha')],
      headers: { Link: `<https://api.github.com${page2}>; rel="next", <https://api.github.com${page2}>; rel="last"` },
    },
    [page2]: { json: [repository('beta')] },
  })
  const repositories = await new GitHubClient('t', github.fetch).listOwnedRepositories()

  assert.deepEqual(
    repositories.map((r) => r.name),
    ['alpha', 'beta'],
  )
})

test('ne suit pas une page suivante hors de l’API GitHub', async () => {
  const github = fakeGitHub({
    [REPOS_URL]: { json: [repository('alpha')], headers: { Link: '<https://evil.example.com/x>; rel="next"' } },
  })
  await new GitHubClient('t', github.fetch).listOwnedRepositories()

  assert.equal(github.requests.length, 1)
})

test('ignore les dépôts mal formés', async () => {
  const github = fakeGitHub({ [REPOS_URL]: { json: [repository('alpha'), { name: 'sans-reste' }, null] } })
  const repositories = await new GitHubClient('t', github.fetch).listOwnedRepositories()

  assert.deepEqual(
    repositories.map((r) => r.name),
    ['alpha'],
  )
})

test('trouve la dernière branche poussée', async () => {
  const github = fakeGitHub({ [activityUrl('alpha')]: pushedTo('feat/grille') })
  assert.equal(await new GitHubClient('t', github.fetch).findLatestActiveBranch('jl/alpha'), 'feat/grille')
})

test('retient la branche cible du dernier merge de PR', async () => {
  const github = fakeGitHub({
    [activityUrl('alpha')]: {
      json: [
        { activity_type: 'pr_merge', ref: 'refs/heads/main' },
        { activity_type: 'push', ref: 'refs/heads/feat/x' },
      ],
    },
  })
  assert.equal(await new GitHubClient('t', github.fetch).findLatestActiveBranch('jl/alpha'), 'main')
})

test('passe une branche supprimée pour retenir l’activité suivante', async () => {
  const github = fakeGitHub({
    [activityUrl('alpha')]: {
      json: [
        { activity_type: 'branch_deletion', ref: 'refs/heads/feat/x' },
        { activity_type: 'push', ref: 'refs/heads/feat/y' },
      ],
    },
  })
  assert.equal(await new GitHubClient('t', github.fetch).findLatestActiveBranch('jl/alpha'), 'feat/y')
})

test('ne trouve aucune branche dans un dépôt sans activité', async () => {
  const github = fakeGitHub({ [activityUrl('alpha')]: { json: [] } })
  assert.equal(await new GitHubClient('t', github.fetch).findLatestActiveBranch('jl/alpha'), null)
})

test('ignore une activité qui ne concerne pas une branche', async () => {
  const github = fakeGitHub({ [activityUrl('alpha')]: { json: [{ ref: 'refs/tags/v1' }] } })
  assert.equal(await new GitHubClient('t', github.fetch).findLatestActiveBranch('jl/alpha'), null)
})

test('lit summary.md sur la branche demandée', async () => {
  const github = fakeGitHub({ [summaryUrl('alpha', 'feat/x')]: { text: '## Attentes' } })
  assert.equal(await new GitHubClient('t', github.fetch).fetchSummaryFile('jl/alpha', 'feat/x'), '## Attentes')
})

test('encode le nom de branche dans l’URL', async () => {
  const github = fakeGitHub({})
  await new GitHubClient('t', github.fetch).fetchSummaryFile('jl/alpha', 'feat/a&b')

  assert.ok(github.requests[0].url.endsWith('?ref=feat%2Fa%26b'))
})

test('renvoie null quand summary.md est absent', async () => {
  const github = fakeGitHub({})
  assert.equal(await new GitHubClient('t', github.fetch).fetchSummaryFile('jl/alpha', 'main'), null)
})

test('signale un refus du serveur avec son code HTTP', async () => {
  const github = fakeGitHub({ [REPOS_URL]: { status: 401 } })
  await assert.rejects(new GitHubClient('t', github.fetch).listOwnedRepositories(), (error) => {
    return error instanceof GitHubHttpError && error.status === 401
  })
})

test('signale une coupure réseau distinctement d’un refus', async () => {
  const github = fakeGitHub({ [REPOS_URL]: { networkError: true } })
  await assert.rejects(new GitHubClient('t', github.fetch).listOwnedRepositories(), GitHubNetworkError)
})

test('ne prend pas une erreur serveur sur summary.md pour un fichier absent', async () => {
  const github = fakeGitHub({ [summaryUrl('alpha', 'main')]: { status: 503 } })
  await assert.rejects(new GitHubClient('t', github.fetch).fetchSummaryFile('jl/alpha', 'main'), GitHubHttpError)
})

test('signale une limite de débit sur un 403 au quota épuisé', async () => {
  const github = fakeGitHub({ [REPOS_URL]: { status: 403, headers: { 'x-ratelimit-remaining': '0' } } })
  await assert.rejects(new GitHubClient('t', github.fetch).listOwnedRepositories(), (error) => {
    return error instanceof GitHubHttpError && error.rateLimited
  })
})

test('signale une limite de débit sur un 429', async () => {
  const github = fakeGitHub({ [REPOS_URL]: { status: 429 } })
  await assert.rejects(new GitHubClient('t', github.fetch).listOwnedRepositories(), (error) => {
    return error instanceof GitHubHttpError && error.rateLimited
  })
})

test('ne prend pas un simple refus 403 pour une limite de débit', async () => {
  const github = fakeGitHub({ [REPOS_URL]: { status: 403 } })
  await assert.rejects(new GitHubClient('t', github.fetch).listOwnedRepositories(), (error) => {
    return error instanceof GitHubHttpError && !error.rateLimited
  })
})

test('range un JSON illisible parmi les erreurs réseau', async () => {
  const github = fakeGitHub({ [REPOS_URL]: { text: '{ pas du json' } })
  await assert.rejects(new GitHubClient('t', github.fetch).listOwnedRepositories(), GitHubNetworkError)
})

test('range une coupure pendant la lecture du contenu parmi les erreurs réseau', async () => {
  const brokenBody = new ReadableStream({
    start(controller) {
      controller.error(new TypeError('connexion interrompue'))
    },
  })
  const fetchWithBrokenBody = async () => new Response(brokenBody, { status: 200 })
  const client = new GitHubClient('t', fetchWithBrokenBody)
  await assert.rejects(client.fetchSummaryFile('jl/alpha', 'main'), GitHubNetworkError)
})

test('renvoie null pour un dépôt vide', async () => {
  const github = fakeGitHub({ [summaryUrl('alpha', 'main')]: { status: 409 } })
  assert.equal(await new GitHubClient('t', github.fetch).fetchSummaryFile('jl/alpha', 'main'), null)
})

test('ne retient pas une branche supprimée même poussée avant sa suppression', async () => {
  const github = fakeGitHub({
    [activityUrl('alpha')]: {
      json: [
        { activity_type: 'branch_deletion', ref: 'refs/heads/feat/x' },
        { activity_type: 'push', ref: 'refs/heads/feat/x' },
        { activity_type: 'push', ref: 'refs/heads/feat/y' },
      ],
    },
  })
  assert.equal(await new GitHubClient('t', github.fetch).findLatestActiveBranch('jl/alpha'), 'feat/y')
})

test('retient une branche recréée après sa suppression', async () => {
  const github = fakeGitHub({
    [activityUrl('alpha')]: {
      json: [
        { activity_type: 'push', ref: 'refs/heads/feat/x' },
        { activity_type: 'branch_deletion', ref: 'refs/heads/feat/x' },
      ],
    },
  })
  assert.equal(await new GitHubClient('t', github.fetch).findLatestActiveBranch('jl/alpha'), 'feat/x')
})

test('écarte un dépôt dont le lien ne pointe pas vers github.com', async () => {
  const fake = { ...repository('alpha'), html_url: 'https://evil.example.com/jl/alpha' }
  const github = fakeGitHub({ [REPOS_URL]: { json: [fake, repository('beta')] } })
  const repositories = await new GitHubClient('t', github.fetch).listOwnedRepositories()

  assert.deepEqual(
    repositories.map((r) => r.name),
    ['beta'],
  )
})

test('écarte les forks', async () => {
  const fork = { ...repository('copie'), fork: true }
  const github = fakeGitHub({ [REPOS_URL]: { json: [fork, repository('beta')] } })
  const repositories = await new GitHubClient('t', github.fetch).listOwnedRepositories()

  assert.deepEqual(
    repositories.map((r) => r.name),
    ['beta'],
  )
})

test('garde les dépôts archivés', async () => {
  const archived = { ...repository('ancien'), archived: true }
  const github = fakeGitHub({ [REPOS_URL]: { json: [archived] } })
  const repositories = await new GitHubClient('t', github.fetch).listOwnedRepositories()

  assert.deepEqual(
    repositories.map((r) => r.name),
    ['ancien'],
  )
})
