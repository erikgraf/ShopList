import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import './index.css';
import App from './App.tsx';
import { IconGallery } from './IconGallery.tsx';
import { GapFinder } from './GapFinder.tsx';
import { warmSnapshot } from './snapshot';

if (import.meta.env.PROD) {
  // Production: keep the service worker for offline + snapshot caching.
  // `immediate: true` skips the waiting phase so new versions activate
  // on the next navigation, matching `registerType: 'autoUpdate'` in
  // vite.config.ts.
  registerSW({ immediate: true });
} else if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
  // Dev: never run a service worker. It only causes "blank page after a
  // broken HMR build" surprises. Also actively evict any leftover SW from
  // a previous prod build or earlier dev session so the user doesn't have
  // to manually unregister.
  void navigator.serviceWorker.getRegistrations().then((regs) => {
    for (const r of regs) void r.unregister();
  });
  if (typeof caches !== 'undefined' && caches.keys) {
    void caches.keys().then((keys) => {
      for (const k of keys) void caches.delete(k);
    });
  }
}

warmSnapshot();

// Unlinked dev surfaces, kept out of the app's own routing so they ship
// harmlessly but stay discoverable by typing the hash on any device:
//   #icons     — gallery of every icon in both styles
//   #unknowns  — catalog/icon gap-finder
const devRoute = location.hash;
const devView =
  devRoute === '#icons' ? <IconGallery /> : devRoute === '#unknowns' ? <GapFinder /> : null;

createRoot(document.getElementById('root')!).render(
  <StrictMode>{devView ?? <App />}</StrictMode>,
);

// The dev-view choice is read once at mount, so reload when entering or
// leaving one of these hashes to swap the root cleanly.
window.addEventListener('hashchange', () => {
  const isDev = (h: string) => h === '#icons' || h === '#unknowns';
  if (location.hash !== devRoute && (isDev(location.hash) || isDev(devRoute))) location.reload();
});
