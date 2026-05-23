import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import './index.css';
import App from './App.tsx';
import { IconGallery } from './IconGallery.tsx';
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

// Unlinked icon-review surface: open `#icons` to render every icon in both
// styles. Kept out of the app's own routing so it ships harmlessly but
// stays discoverable for review on any device.
const isIconGallery = location.hash === '#icons';

createRoot(document.getElementById('root')!).render(
  <StrictMode>{isIconGallery ? <IconGallery /> : <App />}</StrictMode>,
);

// Reload when toggling the #icons hash on/off so the root swaps cleanly
// (the gallery vs. app choice is read once at mount).
window.addEventListener('hashchange', () => {
  if ((location.hash === '#icons') !== isIconGallery) location.reload();
});
