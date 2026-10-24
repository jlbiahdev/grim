import type { Project } from '../github/loadProjects.ts'
import { statusAppearance } from '../ui/statusAppearance.ts'

interface ProjectDetailProps {
  project: Project
}

export function ProjectDetail({ project }: ProjectDetailProps) {
  const { repository, branch, summary } = project
  const appearance = statusAppearance(summary.status)

  return (
    <article aria-labelledby="project-title" className="rounded-md border border-line-strong bg-card p-6">
      <h2 id="project-title" tabIndex={-1} className="text-2xl font-bold text-ink [overflow-wrap:anywhere]">
        {repository.name}
      </h2>
      <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-soft">
        <span className="flex items-center gap-2">
          <span aria-hidden="true" className={`lamp ${appearance.lampClassName}`} />
          {appearance.label}
        </span>
        <span>
          Lu sur la branche <code className="font-mono">{branch}</code>
        </span>
      </p>

      <SummarySection title="Attentes" items={summary.expectations} />
      <SummarySection title="Blocages" items={summary.blockers} />
      <SummarySection title="Prochaines étapes" items={summary.nextSteps} />

      <div className="mt-6 flex flex-wrap gap-3">
        {summary.claudeProjectUrl ? (
          <a href={summary.claudeProjectUrl} target="_blank" rel="noreferrer" className="button-primary">
            Ouvrir dans Claude
          </a>
        ) : (
          <p className="text-sm text-ink-soft">
            Pas de lien <code className="font-mono">claude_project</code> valide dans le summary.md de ce dépôt.
          </p>
        )}
        <a href={repository.htmlUrl} target="_blank" rel="noreferrer" className="button-secondary">
          Voir sur GitHub
        </a>
      </div>
    </article>
  )
}

function SummarySection({ title, items }: { title: string; items: string[] }) {
  return (
    <section className="mt-6">
      <h3 className="text-base font-bold text-accent-text">{title}</h3>
      {items.length > 0 ? (
        <ul className="mt-2 list-disc space-y-1 pl-5 leading-relaxed text-ink [overflow-wrap:anywhere]">
          {items.map((item, index) => (
            <li key={index}>{item}</li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-sm text-ink-soft">Rien d’indiqué.</p>
      )}
    </section>
  )
}
