/** @type {import('tailwindcss').Config} */
// Design inspiré de Fluxo (palette « Minuit & Cobalt », jetons en variables CSS)
// et de Bitojel (police Jura, voyants lumineux, coins de sélection). Les valeurs
// vivent dans src/index.css ; ce fichier ne fait que les nommer.
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        page: 'var(--bg-page)',
        card: 'var(--bg-card)',
        raised: 'var(--bg-card-raised)',
        line: 'var(--border)',
        'line-strong': 'var(--border-strong)',
        'line-field': 'var(--border-field)',
        ink: 'var(--text-primary)',
        'ink-soft': 'var(--text-secondary)',
        accent: 'var(--accent)',
        'accent-hover': 'var(--accent-hover)',
        'accent-text': 'var(--accent-text)',
        'on-accent': 'var(--text-on-accent)',
        danger: 'var(--danger)',
        'danger-bg': 'var(--danger-bg)',
        'danger-text': 'var(--danger-text)',
      },
      fontFamily: {
        sans: ['Jura', 'system-ui', 'sans-serif'],
      },
      // Bordure par défaut aux couleurs du thème, comme Fluxo (sinon le gris clair de Tailwind).
      borderColor: {
        DEFAULT: 'var(--border)',
      },
      // Rayons de Fluxo, gardés tous les trois pour rester aligné sur lui.
      borderRadius: {
        sm: '4px',
        md: '8px',
        lg: '12px',
      },
    },
  },
  plugins: [],
}
