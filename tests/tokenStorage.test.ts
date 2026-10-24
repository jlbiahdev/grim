import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  TOKEN_STORAGE_KEY,
  clearToken,
  isValidTokenFormat,
  readToken,
  saveToken,
  type TokenStore,
} from '../src/token/tokenStorage.ts'

function memoryStore(): TokenStore & { values: Map<string, string> } {
  const values = new Map<string, string>()
  return {
    values,
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => void values.set(key, value),
    removeItem: (key) => void values.delete(key),
  }
}

function failingStore(): TokenStore {
  const fail = () => {
    throw new DOMException('Quota dépassé', 'QuotaExceededError')
  }
  return { getItem: fail, setItem: fail, removeItem: fail }
}

test('relit le token enregistré', () => {
  const store = memoryStore()
  saveToken(store, 'github_pat_abc')
  assert.equal(readToken(store), 'github_pat_abc')
})

test('range le token sous une clé fixe qui ne le contient pas', () => {
  const store = memoryStore()
  saveToken(store, 'github_pat_abc')
  assert.deepEqual([...store.values.keys()], [TOKEN_STORAGE_KEY])
})

test('ne renvoie aucun token quand rien n’est enregistré', () => {
  assert.equal(readToken(memoryStore()), null)
})

test('ne renvoie aucun token quand la valeur enregistrée est blanche', () => {
  const store = memoryStore()
  store.values.set(TOKEN_STORAGE_KEY, '   ')
  assert.equal(readToken(store), null)
})

test('efface le token', () => {
  const store = memoryStore()
  saveToken(store, 'github_pat_abc')
  clearToken(store)
  assert.equal(readToken(store), null)
})

test('signale un enregistrement impossible', () => {
  assert.equal(saveToken(failingStore(), 'github_pat_abc'), false)
})

test('signale un effacement impossible', () => {
  assert.equal(clearToken(failingStore()), false)
})

test('ne renvoie aucun token quand la lecture est impossible', () => {
  assert.equal(readToken(failingStore()), null)
})

test('accepte le format d’un token fine-grained', () => {
  assert.equal(isValidTokenFormat('github_pat_11ABCDEF0123456789_abcdefXYZ'), true)
})

test('accepte le format d’un token classique', () => {
  assert.equal(isValidTokenFormat('ghp_0123456789abcdefABCDEF'), true)
})

test('refuse un token contenant une espace', () => {
  assert.equal(isValidTokenFormat('github_pat_abc def'), false)
})

test('refuse un token contenant une espace invisible', () => {
  assert.equal(isValidTokenFormat('github_pat_abc\u200B'), false)
})

test('refuse un token contenant des points de suspension', () => {
  assert.equal(isValidTokenFormat('github_pat_abc\u2026'), false)
})

test('refuse un token contenant une lettre accentuée', () => {
  assert.equal(isValidTokenFormat('github_pat_\u00e9t\u00e9'), false)
})

test('ignore un token enregistré dont le format est invalide', () => {
  const store = memoryStore()
  store.values.set(TOKEN_STORAGE_KEY, 'github_pat_abc\u2026')
  assert.equal(readToken(store), null)
})
