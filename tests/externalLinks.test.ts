import { test } from 'node:test'
import assert from 'node:assert/strict'
import { isSafeExternalUrl } from '../electron/externalLinks.ts'

test('accepte un lien https vers un projet Claude', () => {
  assert.equal(isSafeExternalUrl('https://claude.ai/project/123'), true)
})

test('refuse un lien http non chiffré', () => {
  assert.equal(isSafeExternalUrl('http://example.com'), false)
})

test('refuse un lien vers un fichier local', () => {
  assert.equal(isSafeExternalUrl('file:///C:/Windows/System32/calc.exe'), false)
})

test('refuse un lien javascript', () => {
  assert.equal(isSafeExternalUrl('javascript:alert(1)'), false)
})

test('refuse une chaîne qui n’est pas une URL', () => {
  assert.equal(isSafeExternalUrl('pas une url'), false)
})
