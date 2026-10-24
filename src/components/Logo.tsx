// Marque de l'application, sur le modèle du logo de Bitojel : sigle encadré de
// coins, nom développé en capitales espacées.
export function Logo() {
  return (
    <span className="flex items-center gap-4">
      <span aria-hidden="true" className="logo-mark">
        GRIM
      </span>
      <span className="text-sm font-semibold uppercase tracking-[0.15em] text-ink">GitHub Repo AI Monitor</span>
    </span>
  )
}
