import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'
import { builtinModules } from 'node:module'

const WEB_ONLY_MESSAGE = 'src/ doit rester du code web pur (future PWA).'

// Modules interdits dans src/ : Electron (et ses sous-chemins), modules Node avec
// ou sans préfixe « node: ». Expression utilisée pour les imports dynamiques,
// que no-restricted-imports ne voit pas. Les « / » sont échappés pour esquery.
const FORBIDDEN_MODULE_PATTERN = `^(electron(\\/.*)?|node:.*|${builtinModules
  .map((name) => name.replaceAll('/', '\\/'))
  .join('|')})$`

export default defineConfig([
  globalIgnores(['dist', 'dist-electron', 'release']),
  js.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    extends: [tseslint.configs.recommended],
  },
  {
    // Interface : code web pur, destiné à devenir la PWA.
    files: ['src/**/*.{js,jsx,ts,tsx}'],
    extends: [reactHooks.configs.flat.recommended, reactRefresh.configs.vite],
    languageOptions: {
      globals: globals.browser,
    },
    rules: {
      // Garde-fou de l'architecture : src/ ne doit dépendre ni d'Electron ni de Node,
      // sinon la même base ne pourra plus tourner dans un navigateur.
      'no-restricted-imports': [
        'error',
        {
          paths: ['electron', ...builtinModules].map((name) => ({ name, message: WEB_ONLY_MESSAGE })),
          patterns: [{ group: ['electron/*', 'node:*'], message: WEB_ONLY_MESSAGE }],
        },
      ],
      'no-restricted-syntax': [
        'error',
        {
          selector: `ImportExpression[source.value=/${FORBIDDEN_MODULE_PATTERN}/]`,
          message: WEB_ONLY_MESSAGE,
        },
      ],
    },
  },
  {
    // Coque Electron, tests et configuration : exécutés par Node.
    files: ['electron/**/*.ts', 'tests/**/*.ts', '*.config.{js,ts}'],
    languageOptions: {
      globals: globals.node,
    },
  },
])
