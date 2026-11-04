import { test } from 'node:test'
import assert from 'node:assert/strict'
import { canUseServiceWorker } from '../src/platform/serviceWorkerSupport.ts'

test('enregistre le service worker pour la PWA servie en https', () => {
  assert.equal(canUseServiceWorker('https:', true), true)
})

test('n’enregistre pas le service worker dans Electron (file://)', () => {
  assert.equal(canUseServiceWorker('file:', true), false)
})

test('n’enregistre pas le service worker en développement (http://localhost)', () => {
  assert.equal(canUseServiceWorker('http:', true), false)
})

test('n’enregistre rien si le navigateur ne connaît pas les service workers', () => {
  assert.equal(canUseServiceWorker('https:', false), false)
})
