import { test } from 'node:test'
import assert from 'node:assert/strict'
import { GitHubHttpError, GitHubNetworkError } from '../src/github/GitHubClient.ts'
import { describeLoadError } from '../src/ui/errorMessage.ts'

const URL = 'https://api.github.com/repos/jl/projet-prive/activity'

test('présente une coupure réseau comme GitHub injoignable', () => {
  const description = describeLoadError(new GitHubNetworkError(URL, new TypeError('Failed to fetch')))
  assert.match(description.message, /injoignable/)
  assert.equal(description.tokenProblem, false)
})

test('met en cause le token sur un 401', () => {
  const description = describeLoadError(new GitHubHttpError(401, URL, false))
  assert.match(description.message, /refuse ce token/)
  assert.equal(description.tokenProblem, true)
})

test('demande de patienter sur une limite de débit', () => {
  const description = describeLoadError(new GitHubHttpError(403, URL, true))
  assert.match(description.message, /Limite de requêtes/)
  assert.equal(description.tokenProblem, false)
})

test('met en cause les droits du token sur un 403 sans limite de débit', () => {
  const description = describeLoadError(new GitHubHttpError(403, URL, false))
  assert.match(description.message, /droits/)
  assert.equal(description.tokenProblem, true)
})

test('indique le code d’une autre erreur serveur', () => {
  assert.match(describeLoadError(new GitHubHttpError(502, URL, false)).message, /502/)
})

test('ne montre jamais l’URL ni le nom du dépôt', () => {
  const errors = [new GitHubNetworkError(URL, null), new GitHubHttpError(500, URL, false)]
  for (const error of errors) {
    assert.doesNotMatch(describeLoadError(error).message, /projet-prive|api\.github\.com/)
  }
})

test('donne un message générique pour une erreur inattendue', () => {
  assert.match(describeLoadError(new Error('boum')).message, /inattendue/)
})
