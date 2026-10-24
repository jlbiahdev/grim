import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createLatestOnly } from '../src/ui/latestOnly.ts'

test('considère une demande seule comme la dernière', () => {
  const request = createLatestOnly().start()
  assert.equal(request.isLatest(), true)
  assert.equal(request.signal.aborted, false)
})

test('rend périmée une demande dépassée par une plus récente', () => {
  const guard = createLatestOnly()
  const first = guard.start()
  guard.start()
  assert.equal(first.isLatest(), false)
})

test('interrompt les requêtes d’une demande dépassée', () => {
  const guard = createLatestOnly()
  const first = guard.start()
  guard.start()
  assert.equal(first.signal.aborted, true)
})

test('garde la demande la plus récente comme dernière, sans l’interrompre', () => {
  const guard = createLatestOnly()
  guard.start()
  const second = guard.start()
  assert.equal(second.isLatest(), true)
  assert.equal(second.signal.aborted, false)
})

test('rend périmée et interrompt la demande en cours après une annulation', () => {
  const guard = createLatestOnly()
  const request = guard.start()
  guard.cancelAll()
  assert.equal(request.isLatest(), false)
  assert.equal(request.signal.aborted, true)
})
