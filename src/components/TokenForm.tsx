import { useState, type FormEvent } from 'react'
import { Logo } from './Logo.tsx'
import { isValidTokenFormat } from '../token/tokenStorage.ts'

const NEW_TOKEN_URL = 'https://github.com/settings/personal-access-tokens/new'

interface TokenFormProps {
  // Renvoie un message d'erreur si le token n'a pas pu être enregistré.
  onSubmit: (token: string) => string | null
  // Information affichée à l'arrivée sur le formulaire (token refusé, par exemple).
  notice: string | null
}

export function TokenForm({ onSubmit, notice }: TokenFormProps) {
  const [token, setToken] = useState('')
  const [inputError, setInputError] = useState<string | null>(null)

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const trimmed = token.trim()
    if (!trimmed) {
      setInputError('Collez un token GitHub pour continuer.')
    } else if (!isValidTokenFormat(trimmed)) {
      setInputError(
        'Ce token contient des caractères invalides (espace, caractère accentué ou invisible). Copiez-le à nouveau depuis GitHub.',
      )
    } else {
      setInputError(onSubmit(trimmed))
    }
  }

  return (
    <main className="mx-auto max-w-lg px-6 py-16">
      <h1>
        <Logo />
      </h1>
      <p className="mt-6 leading-relaxed text-ink-soft">
        L’application lit le <code className="font-mono text-sm">summary.md</code> de chacun de vos dépôts GitHub. Il
        lui faut un token en lecture seule.
      </p>

      {notice && (
        <p role="status" className="mt-6 rounded-md border border-danger bg-danger-bg p-4 text-danger-text">
          {notice}
        </p>
      )}

      <form onSubmit={handleSubmit} noValidate className="mt-6 rounded-md border border-line-strong bg-card p-6">
        <label htmlFor="github-token" className="block font-semibold text-ink">
          Token GitHub
        </label>
        <input
          id="github-token"
          type="password"
          autoFocus
          autoComplete="off"
          spellCheck={false}
          value={token}
          onChange={(event) => setToken(event.target.value)}
          aria-describedby={inputError ? 'token-error token-help' : 'token-help'}
          aria-invalid={inputError ? true : undefined}
          className="mt-2 w-full rounded-sm border border-line-field bg-page px-3 py-2 font-mono text-sm text-ink placeholder:text-ink-soft"
          placeholder="github_pat_…"
        />
        {inputError && (
          <p id="token-error" role="alert" className="mt-2 text-sm text-danger-text">
            {inputError}
          </p>
        )}
        <button type="submit" className="button-primary mt-4">
          Enregistrer le token
        </button>
      </form>

      <div id="token-help" className="mt-6 text-sm leading-relaxed text-ink-soft">
        <p>
          <a href={NEW_TOKEN_URL} target="_blank" rel="noreferrer" className="font-semibold text-accent-text underline">
            Créer un token fine-grained sur GitHub
          </a>{' '}
          avec l’accès à tous vos dépôts et deux droits en lecture seule : « Metadata » et « Contents ».
        </p>
        <p className="mt-2">Le token reste sur cet appareil.</p>
      </div>
    </main>
  )
}
