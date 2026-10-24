import { test } from 'node:test'
import assert from 'node:assert/strict'
import { GitHubHttpError, GitHubNetworkError } from '../src/github/GitHubClient.ts'
import type { LoadProjectsResult } from '../src/github/loadProjects.ts'
import {
  failedState,
  loadedState,
  projectsView,
  refreshingState,
  type ProjectsState,
} from '../src/ui/projectsState.ts'

const RESULT: LoadProjectsResult = { projects: [], failedRepositories: ['jl/x'] }
const OTHER_RESULT: LoadProjectsResult = { projects: [], failedRepositories: [] }

test('affiche « en lecture » tant qu’aucun état n’existe', () => {
  assert.deepEqual(projectsView(null, 'A'), { loading: true, result: null, error: null })
})

test('affiche le résultat du token courant', () => {
  assert.deepEqual(projectsView(loadedState('A', RESULT), 'A'), { loading: false, result: RESULT, error: null })
})

test('n’affiche jamais le résultat d’un autre token', () => {
  assert.deepEqual(projectsView(loadedState('A', RESULT), 'B'), { loading: true, result: null, error: null })
})

test('n’affiche rien sans token', () => {
  assert.equal(projectsView(loadedState('A', RESULT), null).result, null)
})

test('garde les projets affichés pendant une actualisation', () => {
  const view = projectsView(refreshingState(loadedState('A', RESULT), 'A'), 'A')
  assert.deepEqual(view, { loading: true, result: RESULT, error: null })
})

test('efface l’erreur précédente au début d’une actualisation', () => {
  const failed = failedState(null, 'A', new GitHubHttpError(500, 'u', false))
  assert.equal(refreshingState(failed, 'A')?.error, null)
})

test('ne transforme pas l’état d’un autre token en actualisation', () => {
  const previous = loadedState('A', RESULT)
  assert.equal(refreshingState(previous, 'B'), previous)
})

test('remplace le résultat à l’arrivée d’un nouveau chargement', () => {
  assert.equal(loadedState('A', OTHER_RESULT).result, OTHER_RESULT)
})

test('garde les projets déjà lus après une coupure réseau', () => {
  const state = failedState(loadedState('A', RESULT), 'A', new GitHubNetworkError('u', null))
  assert.equal(state.result, RESULT)
})

test('retire les projets après un token refusé', () => {
  const state = failedState(loadedState('A', RESULT), 'A', new GitHubHttpError(401, 'u', false))
  assert.equal(state.result, null)
})

test('ne garde pas les projets d’un autre token après une coupure réseau', () => {
  const state: ProjectsState = failedState(loadedState('A', RESULT), 'B', new GitHubNetworkError('u', null))
  assert.equal(state.result, null)
})

test('affiche l’erreur et n’est plus en lecture après un échec', () => {
  const error = new GitHubHttpError(500, 'u', false)
  assert.deepEqual(projectsView(failedState(null, 'A', error), 'A'), { loading: false, result: null, error })
})
