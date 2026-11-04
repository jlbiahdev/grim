import { useEffect, useRef, useState } from 'react'
import { ProjectDetail } from './components/ProjectDetail.tsx'
import { Logo } from './components/Logo.tsx'
import { ProjectGrid } from './components/ProjectGrid.tsx'
import { TokenForm } from './components/TokenForm.tsx'
import { TOKEN_STORAGE_KEY, readToken, type TokenStore } from './token/tokenStorage.ts'
import { describeLoadError } from './ui/errorMessage.ts'
import { SESSION_ONLY_NOTICE, forgetToken as forgetStoredToken, rememberToken } from './ui/tokenSession.ts'
import { useProjects } from './ui/useProjects.ts'

// Accès paresseux : lire window.localStorage peut lever (stockage interdit) ;
// les fonctions de tokenStorage rattrapent alors l'erreur.
const browserStore: TokenStore = {
  getItem: (key) => window.localStorage.getItem(key),
  setItem: (key, value) => window.localStorage.setItem(key, value),
  removeItem: (key) => window.localStorage.removeItem(key),
}

// En dessous de la largeur « lg » de Tailwind, le détail passe sous la grille.
const STACKED_LAYOUT_QUERY = '(max-width: 1023px)'


export default function App() {
  const [token, setToken] = useState<string | null>(() => readToken(browserStore))
  const [tokenNotice, setTokenNotice] = useState<string | null>(null)
  // Vrai quand le token n'a pas pu être enregistré (navigation privée stricte,
  // stockage plein) : il ne vit qu'en mémoire, le temps de la session.
  const [sessionOnly, setSessionOnly] = useState(false)
  const [selectedFullName, setSelectedFullName] = useState<string | null>(null)
  const { loading, result, error, refresh, reset } = useProjects(token)
  const headingRef = useRef<HTMLHeadingElement>(null)
  // Token courant lisible depuis l'écouteur « storage », installé une seule fois.
  const tokenRef = useRef(token)
  const detailRef = useRef<HTMLDivElement>(null)

  // Le formulaire du token vient de disparaître : le focus clavier repart du
  // titre de l'écran au lieu de retomber au début de la page.
  useEffect(() => {
    tokenRef.current = token
    if (token) {
      headingRef.current?.focus()
    }
  }, [token])

  // Token saisi ou effacé dans un autre onglet : on s'aligne. Si le
  // token lu est le même (réécrit à l'identique), rien ne change : remettre
  // l'état à zéro sans relancer de chargement bloquerait l'écran en lecture.
  useEffect(() => {
    function handleStorage(event: StorageEvent) {
      if (event.key !== TOKEN_STORAGE_KEY && event.key !== null) {
        return
      }
      const storedToken = readToken(browserStore)
      if (storedToken === tokenRef.current) {
        // Le même token vient d'être enregistré ailleurs : il n'est plus
        // seulement en mémoire.
        if (storedToken) {
          setSessionOnly(false)
        }
        return
      }
      reset()
      setSelectedFullName(null)
      setSessionOnly(false)
      setTokenNotice(storedToken ? null : 'Le token a été oublié dans une autre fenêtre.')
      setToken(storedToken)
    }
    window.addEventListener('storage', handleStorage)
    return () => window.removeEventListener('storage', handleStorage)
  }, [reset])

  // Sur écran étroit, le détail est sous la grille : on l'amène à l'écran et on
  // y place le focus, sinon le clic semble sans effet.
  function selectProject(fullName: string) {
    setSelectedFullName(fullName)
    if (window.matchMedia(STACKED_LAYOUT_QUERY).matches) {
      requestAnimationFrame(() => {
        detailRef.current?.scrollIntoView({ block: 'start' })
        detailRef.current?.querySelector<HTMLElement>('#project-title')?.focus({ preventScroll: true })
      })
    }
  }

  // Ne renvoie jamais d'erreur : un stockage refusé ne bloque pas (voir tokenSession).
  function handleTokenSubmit(newToken: string): string | null {
    setSessionOnly(rememberToken(browserStore, newToken).sessionOnly)
    setTokenNotice(null)
    setSelectedFullName(null)
    setToken(newToken)
    return null
  }

  function forgetToken(reason: string | null) {
    setTokenNotice(forgetStoredToken(browserStore, reason))
    setSessionOnly(false)
    reset()
    setSelectedFullName(null)
    setToken(null)
  }

  // aria-disabled plutôt que disabled : un bouton désactivé perd le focus clavier.
  function handleRefresh() {
    if (!loading) {
      refresh()
    }
  }

  if (!token) {
    return <TokenForm onSubmit={handleTokenSubmit} notice={tokenNotice} />
  }

  const errorDescription = error ? describeLoadError(error) : null
  const projects = result?.projects ?? []
  const failedRepositories = result?.failedRepositories ?? []
  const selectedProject = projects.find((project) => project.repository.fullName === selectedFullName) ?? null

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-line pb-5">
        <div>
          <h1 ref={headingRef} tabIndex={-1}>
            <Logo />
          </h1>
          <p className="mt-2 text-sm text-ink-soft" aria-live="polite">
            {loading ? 'Lecture des projets…' : result ? projectCountLabel(projects.length) : ' '}
          </p>
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={handleRefresh}
            aria-disabled={loading}
            className="button-secondary aria-disabled:cursor-wait aria-disabled:opacity-75"
          >
            Actualiser
          </button>
          <button
            type="button"
            onClick={() => forgetToken(null)}
            className="button px-3 text-ink-soft hover:text-ink"
          >
            Oublier le token
          </button>
        </div>
      </header>

      <main>
        {sessionOnly && (
          <p role="status" className="mt-6 text-sm text-ink-soft">
            {SESSION_ONLY_NOTICE}
          </p>
        )}

        {errorDescription && (
          <div role="alert" className="mt-6 rounded-md border border-danger bg-danger-bg p-4 text-danger-text">
            <p>{errorDescription.message}</p>
            {errorDescription.tokenProblem && (
              <button
                type="button"
                onClick={() => forgetToken(errorDescription.message)}
                className="button-primary mt-3"
              >
                Saisir un autre token
              </button>
            )}
          </div>
        )}

        {failedRepositories.length > 0 && (
          <p className="mt-6 text-sm text-ink-soft">
            Lecture impossible pour : {failedRepositories.join(', ')}. Actualisez pour réessayer.
          </p>
        )}

        {result && projects.length === 0 && failedRepositories.length === 0 && (
          <p className="mt-10 max-w-prose leading-relaxed text-ink-soft">
            Aucun de vos dépôts ne contient de <code className="font-mono">summary.md</code> à la racine. Ajoutez-en un
            dans un dépôt, puis actualisez.
          </p>
        )}

        {projects.length > 0 && (
          <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)]">
            <ProjectGrid projects={projects} selectedFullName={selectedFullName} onSelect={selectProject} />
            <div ref={detailRef} className="scroll-mt-6 lg:sticky lg:top-6 lg:self-start">
              {selectedProject ? (
                <ProjectDetail project={selectedProject} />
              ) : (
                <p className="rounded-md border border-dashed border-line-strong p-6 text-ink-soft">
                  Choisissez un projet pour voir ses attentes, ses blocages et ses prochaines étapes.
                </p>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

function projectCountLabel(count: number): string {
  if (count === 0) {
    return 'Aucun projet'
  }
  return count === 1 ? '1 projet' : `${count} projets`
}
