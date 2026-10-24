import { GitHubHttpError, GitHubNetworkError } from '../github/GitHubClient.ts'

export interface LoadErrorDescription {
  message: string
  // Le token lui-même est en cause : proposer d'en saisir un autre.
  tokenProblem: boolean
}

// Messages destinés à l'utilisateur : la cause et quoi faire, sans détail
// technique ni URL (qui contiendrait le nom de dépôts privés).
export function describeLoadError(error: unknown): LoadErrorDescription {
  if (error instanceof GitHubNetworkError) {
    return { message: 'GitHub est injoignable. Vérifiez la connexion, puis actualisez.', tokenProblem: false }
  }
  if (error instanceof GitHubHttpError) {
    if (error.status === 401) {
      return { message: 'GitHub refuse ce token : il est invalide, expiré ou révoqué.', tokenProblem: true }
    }
    if (error.rateLimited) {
      return {
        message: 'Limite de requêtes GitHub atteinte. Patientez quelques minutes avant d’actualiser.',
        tokenProblem: false,
      }
    }
    if (error.status === 403) {
      return {
        message: 'Ce token n’a pas les droits nécessaires (lecture des métadonnées et du contenu des dépôts).',
        tokenProblem: true,
      }
    }
    return { message: `GitHub a répondu par une erreur (${error.status}). Réessayez plus tard.`, tokenProblem: false }
  }
  return { message: 'Erreur inattendue pendant la lecture des projets.', tokenProblem: false }
}
