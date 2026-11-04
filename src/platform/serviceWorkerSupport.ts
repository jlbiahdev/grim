// Le service worker n'existe que pour la PWA servie en https. Dans Electron
// (file://) et en développement (http://localhost), on ne l'enregistre pas :
// le navigateur le refuserait, ou il servirait une version périmée en cache.
export function canUseServiceWorker(protocol: string, hasServiceWorkerApi: boolean): boolean {
  return protocol === 'https:' && hasServiceWorkerApi
}
