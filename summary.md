---
status: en cours
---

## Attentes
- GRIM : une application de bureau (Electron) qui affiche mes projets en grille à partir de leur `summary.md` sur GitHub, avec le détail au clic et l'ouverture du projet dans son IA.
- Une fois la v0 validée, la même application en PWA.
- Un projet présentable sur mon CV.

## Blocages
- Quota de revue Copilot épuisé : les PR attendent sa reconstitution.

## Prochaines étapes
- Merger l'import de GRIM (copie nettoyée de l'ancien dépôt privé, renommage, licence MIT).
- Champ `ai_project` : ouverture du projet dans n'importe quelle IA, `claude_project` toujours lu.
- Bouton « Aide » avec la consigne à copier pour l'IA.
- Merger le packaging, puis publier la release `v0.1.0` sur GitHub : les installateurs macOS et Windows s'y attachent seuls.
- Page de téléchargement et captures d'écran.
- Plus tard : résumés et interface en anglais, PWA (avec repli : token gardé en mémoire si le stockage est interdit).
