import type { Project } from '../github/loadProjects.ts'
import { statusAppearance } from '../ui/statusAppearance.ts'

interface ProjectGridProps {
  projects: Project[]
  selectedFullName: string | null
  onSelect: (fullName: string) => void
}

// Matrice de voyants : un bouton par projet, voyant coloré selon le statut.
export function ProjectGrid({ projects, selectedFullName, onSelect }: ProjectGridProps) {
  return (
    // content-start : les tuiles gardent leur hauteur même quand le panneau de
    // détail voisin est plus haut que la grille.
    <ul className="grid grid-cols-[repeat(auto-fill,minmax(11rem,1fr))] content-start gap-3">
      {projects.map((project) => {
        const { fullName, name } = project.repository
        const appearance = statusAppearance(project.summary.status)
        const isSelected = fullName === selectedFullName
        return (
          <li key={fullName}>
            <button
              type="button"
              onClick={() => onSelect(fullName)}
              aria-current={isSelected ? 'true' : undefined}
              className={isSelected ? 'tile tile-selected' : 'tile hover:border-accent'}
            >
              <span className="flex items-center gap-2 text-sm text-ink-soft">
                <span aria-hidden="true" className={`lamp ${appearance.lampClassName}`} />
                {appearance.label}
              </span>
              <span className="text-lg font-bold leading-tight text-ink [overflow-wrap:anywhere]">{name}</span>
            </button>
          </li>
        )
      })}
    </ul>
  )
}
