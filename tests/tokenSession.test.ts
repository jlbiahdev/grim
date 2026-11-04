import { test } from 'node:test'
import assert from 'node:assert/strict'
import { TOKEN_STORAGE_KEY, type TokenStore } from '../src/token/tokenStorage.ts'
import { CLEAR_FAILED_NOTICE, forgetToken, rememberToken } from '../src/ui/tokenSession.ts'

function memoryStore(): TokenStore & { values: Map<string, string> } {
  const values = new Map<string, string>()
  return {
    values,
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => void values.set(key, value),
    removeItem: (key) => void values.delete(key),
  }
}

const failingStore: TokenStore = {
  getItem: () => null,
  setItem: () => {
    throw new DOMException('plein', 'QuotaExceededError')
  },
  removeItem: () => {
    throw new DOMException('interdit', 'SecurityError')
  },
}

test('enregistre le token quand le stockage l’accepte', () => {
  const store = memoryStore()
  assert.deepEqual(rememberToken(store, 'github_pat_A'), { sessionOnly: false })
  assert.equal(store.values.get(TOKEN_STORAGE_KEY), 'github_pat_A')
})

test('garde le token pour la session seulement quand le stockage le refuse', () => {
  assert.deepEqual(rememberToken(failingStore, 'github_pat_A'), { sessionOnly: true })
})

test('oublie le token sans message quand l’effacement réussit', () => {
  const store = memoryStore()
  rememberToken(store, 'github_pat_A')
  assert.equal(forgetToken(store, null), null)
  assert.equal(store.values.has(TOKEN_STORAGE_KEY), false)
})

test('signale un effacement impossible', () => {
  assert.equal(forgetToken(failingStore, null), CLEAR_FAILED_NOTICE)
})

test('garde la raison de l’oubli et y ajoute l’échec d’effacement', () => {
  assert.equal(forgetToken(failingStore, 'Token refusé.'), `Token refusé. ${CLEAR_FAILED_NOTICE}`)
})
