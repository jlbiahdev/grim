import type { ProjectStatus } from '../summary/parseSummary.ts'

export interface StatusAppearance {
  label: string
  // Classe de couleur du voyant, définie dans index.css à côté de « lamp ». Noms
  // écrits en entier : Tailwind ne génère que les classes qu'il trouve telles
  // quelles dans le code (un nom construit dynamiquement serait sans couleur).
  lampClassName: string
}

// Le statut est toujours écrit en clair à côté du voyant : la couleur seule ne
// suffit pas à le lire (daltonisme, impression en noir et blanc).
const APPEARANCES: Record<ProjectStatus, StatusAppearance> = {
  'en cours': { label: 'En cours', lampClassName: 'lamp-active' },
  bloqué: { label: 'Bloqué', lampClassName: 'lamp-blocked' },
  'en pause': { label: 'En pause', lampClassName: 'lamp-paused' },
  terminé: { label: 'Terminé', lampClassName: 'lamp-done' },
  inconnu: { label: 'Statut inconnu', lampClassName: 'lamp-unknown' },
}

export function statusAppearance(status: ProjectStatus): StatusAppearance {
  return APPEARANCES[status]
}
