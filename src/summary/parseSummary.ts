// Lecture du summary.md d'un projet : un en-tête (claude_project, status) puis
// trois sections de listes à puces. Le fichier est écrit à la main : la lecture
// est tolérante (fins de ligne Windows, en-tête absent, sections manquantes) et
// ne lève jamais d'erreur.

const KNOWN_STATUSES = ['en cours', 'bloqué', 'en pause', 'terminé'] as const

export type ProjectStatus = (typeof KNOWN_STATUSES)[number] | 'inconnu'

export interface ProjectSummary {
  claudeProjectUrl: string | null
  status: ProjectStatus
  expectations: string[]
  blockers: string[]
  nextSteps: string[]
}

const FRONT_MATTER_DELIMITER = '---'
// Expressions volontairement simples : une expression à motifs imbriqués peut
// prendre un temps explosif sur une ligne pleine d'espaces et figer l'interface.
const HEADING_PATTERN = /^#{1,6}[ \t]+(.*)$/
const BULLET_PATTERN = /^[ \t]*[-*][ \t]+(.*)$/
const CLAUDE_PROJECT_PATH = /^\/project\/[^/]+/

export function parseSummary(markdown: string): ProjectSummary {
  const lines = splitLines(markdown)
  const { header, body } = splitFrontMatter(lines)
  const sections = readSections(body)

  return {
    claudeProjectUrl: toClaudeProjectUrl(header.get('claude_project')),
    status: toStatus(header.get('status')),
    expectations: sections.get('attentes') ?? [],
    blockers: sections.get('blocages') ?? [],
    nextSteps: sections.get('prochaines étapes') ?? [],
  }
}

function splitLines(markdown: string): string[] {
  // Le BOM ajouté par certains éditeurs Windows empêcherait de reconnaître « --- ».
  return markdown.replace(/^\uFEFF/, '').split(/\r?\n/)
}

// Une Map plutôt qu'un objet : une clé « constructor » ou « __proto__ » écrite
// dans le fichier ne doit pas tomber sur une propriété héritée.
function splitFrontMatter(lines: string[]): { header: Map<string, string>; body: string[] } {
  const header = new Map<string, string>()
  if (lines[0]?.trim() !== FRONT_MATTER_DELIMITER) {
    return { header, body: lines }
  }

  const closingIndex = lines.findIndex((line, index) => index > 0 && line.trim() === FRONT_MATTER_DELIMITER)
  if (closingIndex === -1) {
    return { header, body: lines }
  }

  for (const line of lines.slice(1, closingIndex)) {
    const separatorIndex = line.indexOf(':')
    if (separatorIndex > 0) {
      const key = line.slice(0, separatorIndex).trim().toLowerCase()
      header.set(key, toHeaderValue(line.slice(separatorIndex + 1)))
    }
  }
  return { header, body: lines.slice(closingIndex + 1) }
}

// L'en-tête suit la syntaxe YAML courante : commentaire après « # » précédé d'un
// espace (le format documenté en montre un), valeur éventuellement entre guillemets.
function toHeaderValue(rawValue: string): string {
  const commentStart = rawValue.search(/[ \t]#/)
  const value = (commentStart === -1 ? rawValue : rawValue.slice(0, commentStart)).trim()
  const isQuoted = value.length >= 2 && (value[0] === '"' || value[0] === "'") && value.at(-1) === value[0]
  return isQuoted ? value.slice(1, -1).trim() : value
}

function readSections(lines: string[]): Map<string, string[]> {
  const sections = new Map<string, string[]>()
  let currentItems: string[] | null = null

  for (const line of lines) {
    const heading = HEADING_PATTERN.exec(line)
    if (heading) {
      // Une section répétée complète la première au lieu de l'effacer.
      const key = toSectionKey(heading[1])
      currentItems = sections.get(key) ?? []
      sections.set(key, currentItems)
      continue
    }

    const bullet = BULLET_PATTERN.exec(line)
    const item = bullet?.[1].trim()
    if (currentItems && item) {
      currentItems.push(item)
    }
  }
  return sections
}

// « ## Prochaines étapes ## » et « ## Blocages : » désignent la même section que
// « ## Prochaines étapes » et « ## Blocages ».
function toSectionKey(title: string): string {
  let key = normalizeText(title)
  while (key.endsWith('#') || key.endsWith(':')) {
    key = key.slice(0, -1).trim()
  }
  return key
}

// Le lien est ouvert dans le navigateur : seuls les projets claude.ai en https
// sont acceptés. Un modèle non rempli (« <id> ») est traité comme absent.
function toClaudeProjectUrl(value: string | undefined): string | null {
  if (!value || /[<>\s]/.test(value)) {
    return null
  }
  try {
    const url = new URL(value)
    const isClaudeProject =
      url.protocol === 'https:' && url.hostname === 'claude.ai' && CLAUDE_PROJECT_PATH.test(url.pathname)
    return isClaudeProject ? url.href : null
  } catch {
    return null
  }
}

function toStatus(value: string | undefined): ProjectStatus {
  const status = normalizeText(value ?? '')
  return KNOWN_STATUSES.find((known) => known === status) ?? 'inconnu'
}

// NFC : un « é » peut être écrit en un ou deux caractères selon l'éditeur.
function normalizeText(text: string): string {
  return text.trim().toLowerCase().normalize('NFC')
}
