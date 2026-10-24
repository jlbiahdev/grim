// Coque Electron volontairement mince : elle ouvre une fenêtre et y charge
// l'interface web de src/. Toute la logique vit dans l'interface, pour que la
// même base devienne une PWA sans réécriture.
import { app, BrowserWindow, shell } from 'electron'
import { fileURLToPath } from 'node:url'
import { isSafeExternalUrl } from './externalLinks.js'

const DEV_SERVER_URL = 'http://localhost:5173'
// Une version packagée ignore --dev : elle ne doit jamais charger un serveur local.
const isDevMode = !app.isPackaged && process.argv.includes('--dev')

function createMainWindow(): void {
  const window = new BrowserWindow({
    width: 1200,
    height: 800,
    title: 'GRIM',
    // Fond du thème sombre (jeton --bg-page de src/index.css) : évite un flash
    // blanc avant le chargement de l'interface.
    backgroundColor: '#090e1a',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  })

  // Les liens « Ouvrir dans Claude » s'ouvrent dans le navigateur du système,
  // jamais dans une nouvelle fenêtre Electron.
  window.webContents.setWindowOpenHandler(({ url }) => {
    if (isSafeExternalUrl(url)) {
      void shell.openExternal(url)
    }
    return { action: 'deny' }
  })

  // La fenêtre principale ne doit jamais quitter l'interface de l'application.
  window.webContents.on('will-navigate', (event) => {
    event.preventDefault()
  })

  if (isDevMode) {
    void window.loadURL(DEV_SERVER_URL)
  } else {
    void window.loadFile(fileURLToPath(new URL('../dist/index.html', import.meta.url)))
  }
}

void app.whenReady().then(() => {
  createMainWindow()

  // macOS : recréer une fenêtre quand on clique sur l'icône du Dock.
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
