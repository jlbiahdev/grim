import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parseSummary } from '../src/summary/parseSummary.ts'

const COMPLETE_SUMMARY = `---
claude_project: https://claude.ai/project/0123-abcd
status: en cours
---

## Attentes
- Une grille de projets
- Un détail au clic

## Blocages
- Aucun

## Prochaines étapes
- Lire GitHub
`

test('lit le lien du projet Claude dans l’en-tête', () => {
  assert.equal(parseSummary(COMPLETE_SUMMARY).claudeProjectUrl, 'https://claude.ai/project/0123-abcd')
})

test('lit le statut dans l’en-tête', () => {
  assert.equal(parseSummary(COMPLETE_SUMMARY).status, 'en cours')
})

test('lit les attentes sous forme de liste', () => {
  assert.deepEqual(parseSummary(COMPLETE_SUMMARY).expectations, ['Une grille de projets', 'Un détail au clic'])
})

test('lit les blocages tels qu’écrits', () => {
  assert.deepEqual(parseSummary(COMPLETE_SUMMARY).blockers, ['Aucun'])
})

test('lit les prochaines étapes', () => {
  assert.deepEqual(parseSummary(COMPLETE_SUMMARY).nextSteps, ['Lire GitHub'])
})

test('accepte les fins de ligne Windows', () => {
  const summary = parseSummary(COMPLETE_SUMMARY.replaceAll('\n', '\r\n'))
  assert.equal(summary.status, 'en cours')
  assert.deepEqual(summary.nextSteps, ['Lire GitHub'])
})

test('accepte un fichier commençant par un BOM', () => {
  assert.equal(parseSummary('\uFEFF' + COMPLETE_SUMMARY).status, 'en cours')
})

test('ignore le commentaire placé après le statut', () => {
  const summary = parseSummary('---\nstatus: bloqué   # en cours | bloqué\n---\n')
  assert.equal(summary.status, 'bloqué')
})

test('reconnaît un statut écrit en majuscules', () => {
  assert.equal(parseSummary('---\nstatus: En Pause\n---\n').status, 'en pause')
})

test('reconnaît un statut accentué écrit en forme décomposée', () => {
  assert.equal(parseSummary('---\nstatus: termine\u0301\n---\n').status, 'terminé')
})

test('marque inconnu un statut mal orthographié', () => {
  assert.equal(parseSummary('---\nstatus: encours\n---\n').status, 'inconnu')
})

test('marque inconnu un statut absent', () => {
  assert.equal(parseSummary('---\nclaude_project: https://claude.ai/project/1\n---\n').status, 'inconnu')
})

test('ne confond pas une clé héritée d’objet avec une valeur de l’en-tête', () => {
  assert.equal(parseSummary('---\nconstructor: x\n---\n').status, 'inconnu')
})

test('lit les sections d’un fichier sans en-tête', () => {
  const summary = parseSummary('## Blocages\n- Attente du quota\n')
  assert.equal(summary.status, 'inconnu')
  assert.deepEqual(summary.blockers, ['Attente du quota'])
})

test('traite un en-tête non refermé comme du contenu', () => {
  const summary = parseSummary('---\nstatus: en cours\n## Attentes\n- A\n')
  assert.equal(summary.status, 'inconnu')
  assert.deepEqual(summary.expectations, ['A'])
})

test('renvoie des listes vides quand les sections manquent', () => {
  const summary = parseSummary('---\nstatus: terminé\n---\n')
  assert.deepEqual([summary.expectations, summary.blockers, summary.nextSteps], [[], [], []])
})

test('accepte les puces en astérisque', () => {
  assert.deepEqual(parseSummary('## Attentes\n* A\n* B\n').expectations, ['A', 'B'])
})

test('ignore les lignes qui ne sont pas des puces', () => {
  assert.deepEqual(parseSummary('## Attentes\nTexte libre\n- A\n').expectations, ['A'])
})

test('ignore les puces vides', () => {
  assert.deepEqual(parseSummary('## Attentes\n- \n- A\n').expectations, ['A'])
})

test('ignore les puces d’une section non reconnue', () => {
  const summary = parseSummary('## Notes\n- N\n## Attentes\n- A\n')
  assert.deepEqual(summary.expectations, ['A'])
})

test('reconnaît un titre de section quelle que soit sa casse', () => {
  assert.deepEqual(parseSummary('## PROCHAINES ÉTAPES\n- Suite\n').nextSteps, ['Suite'])
})

test('refuse un lien de projet en http', () => {
  assert.equal(parseSummary('---\nclaude_project: http://claude.ai/project/1\n---\n').claudeProjectUrl, null)
})

test('refuse un lien vers un autre site que claude.ai', () => {
  const summary = parseSummary('---\nclaude_project: https://claude.ai.example.com/project/1\n---\n')
  assert.equal(summary.claudeProjectUrl, null)
})

test('refuse un lien claude.ai qui ne désigne pas un projet', () => {
  assert.equal(parseSummary('---\nclaude_project: https://claude.ai/settings\n---\n').claudeProjectUrl, null)
})

test('traite le modèle non rempli comme un lien absent', () => {
  const summary = parseSummary('---\nclaude_project: https://claude.ai/project/<id>\n---\n')
  assert.equal(summary.claudeProjectUrl, null)
})

test('traite une valeur qui n’est pas une URL comme un lien absent', () => {
  assert.equal(parseSummary('---\nclaude_project: à venir\n---\n').claudeProjectUrl, null)
})

test('analyse en temps court un titre rempli d’espaces', () => {
  const start = performance.now()
  parseSummary('## a' + ' '.repeat(10_000) + 'x\n')
  assert.ok(performance.now() - start < 100)
})

test('ignore le commentaire placé après le lien du projet', () => {
  const summary = parseSummary('---\nclaude_project: https://claude.ai/project/42   # lien\n---\n')
  assert.equal(summary.claudeProjectUrl, 'https://claude.ai/project/42')
})

test('accepte un statut entre guillemets', () => {
  assert.equal(parseSummary('---\nstatus: "en cours"\n---\n').status, 'en cours')
})

test('accepte un lien entre apostrophes', () => {
  const summary = parseSummary("---\nclaude_project: 'https://claude.ai/project/42'\n---\n")
  assert.equal(summary.claudeProjectUrl, 'https://claude.ai/project/42')
})

test('refuse un lien de projet sans identifiant', () => {
  assert.equal(parseSummary('---\nclaude_project: https://claude.ai/project/\n---\n').claudeProjectUrl, null)
})

test('complète une section répétée au lieu de l’effacer', () => {
  assert.deepEqual(parseSummary('## Attentes\n- A\n## Attentes\n- B\n').expectations, ['A', 'B'])
})

test('reconnaît un titre de section suivi de deux-points', () => {
  assert.deepEqual(parseSummary('## Blocages :\n- Quota\n').blockers, ['Quota'])
})

test('reconnaît un titre de section fermé par des dièses', () => {
  assert.deepEqual(parseSummary('## Attentes ##\n- A\n').expectations, ['A'])
})
