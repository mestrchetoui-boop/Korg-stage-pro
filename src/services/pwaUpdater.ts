/**
 * Automatic PWA Service Worker updater.
 * Ensures installed phone PWAs detect newly deployed builds on launch/resume,
 * activate immediately via skipWaiting + clients.claim, and refresh cleanly
 * while keeping all localStorage buttons, sets, and PRO activation intact.
 */
export function registerPwaAutoUpdate(): void {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
  if (!window.location.protocol.startsWith('http')) return;
  if (window.location.pathname.endsWith('korg-offline.html')) return;

  window.addEventListener('load', async () => {
    try {
      const hadController = Boolean(navigator.serviceWorker.controller);
      let isRefreshing = false;

      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!hadController || isRefreshing) return;
        isRefreshing = true;
        window.location.reload();
      });

      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
        updateViaCache: 'none',
      });

      const activateWaitingWorker = (worker: ServiceWorker | null) => {
        if (!worker) return;
        worker.postMessage({ type: 'SKIP_WAITING' });
      };

      if (registration.waiting && navigator.serviceWorker.controller) {
        activateWaitingWorker(registration.waiting);
      }

      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (!newWorker) return;
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            activateWaitingWorker(newWorker);
          }
        });
      });

      const checkForUpdate = () => {
        if (navigator.onLine) {
          registration.update().catch(() => {});
        }
      };

      checkForUpdate();

      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          checkForUpdate();
        }
      });

      window.addEventListener('online', checkForUpdate);
      window.setInterval(checkForUpdate, 15 * 60 * 1000);
    } catch {
      // Ignore if Service Worker registration is blocked or unavailable
    }
  });
}
