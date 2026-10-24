import { test } from 'node:test'
import assert from 'node:assert/strict'
import { statusAppearance } from '../src/ui/statusAppearance.ts'

test('écrit le statut en clair en plus de la couleur du voyant', () => {
  assert.equal(statusAppearance('bloqué').label, 'Bloqué')
})

test('affiche un voyant neutre pour un statut inconnu', () => {
  const appearance = statusAppearance('inconnu')
  assert.equal(appearance.label, 'Statut inconnu')
  assert.equal(appearance.lampClassName, 'lamp-unknown')
})

test('donne une couleur de voyant distincte à chaque statut', () => {
  const statuses = ['en cours', 'bloqué', 'en pause', 'terminé', 'inconnu'] as const
  const lamps = new Set(statuses.map((status) => statusAppearance(status).lampClassName))
  assert.equal(lamps.size, statuses.length)
})

test('a une couleur définie dans la feuille de style pour chaque voyant', async () => {
  const { readFile } = await import('node:fs/promises')
  const css = await readFile(new URL('../src/index.css', import.meta.url), 'utf8')
  const statuses = ['en cours', 'bloqué', 'en pause', 'terminé', 'inconnu'] as const
  for (const status of statuses) {
    const lampClass = statusAppearance(status).lampClassName
    assert.match(css, new RegExp(`\\.${lampClass}\\s*\\{`), `${lampClass} absente d'index.css`)
  }
})
