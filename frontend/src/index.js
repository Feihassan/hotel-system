import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    const swUrl = `/sw.js?v=${__BUILD_TIME__}`;

    navigator.serviceWorker.register(swUrl).then((registration) => {

      const checkForWaiting = (reg) => {
        // Only show banner if there's a waiting SW AND a controller already exists
        // (i.e. this is an update, not a first install)
        if (reg.waiting && navigator.serviceWorker.controller) {
          showUpdateBanner(reg);
        }
      };

      // Check immediately in case SW is already waiting
      checkForWaiting(registration);

      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (!newWorker) return;
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed') {
            checkForWaiting(registration);
          }
        });
      });

      // Poll for updates every 5 minutes
      setInterval(() => registration.update(), 5 * 60 * 1000);

    }).catch((err) => console.warn('SW registration failed:', err));

    // Only reload when controller changes AND we already had a controller
    // This prevents the first-install reload loop
    if (navigator.serviceWorker.controller) {
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        window.location.reload();
      });
    }
  });
}

function showUpdateBanner(registration) {
  if (document.getElementById('sw-update-banner')) return;

  const banner = document.createElement('div');
  banner.id = 'sw-update-banner';
  banner.style.cssText = [
    'position:fixed', 'bottom:24px', 'left:50%', 'transform:translateX(-50%)',
    'background:#1e293b', 'color:#fff', 'padding:14px 20px',
    'border-radius:10px', 'box-shadow:0 4px 24px rgba(0,0,0,0.35)',
    'display:flex', 'align-items:center', 'gap:16px',
    'font-family:Inter,sans-serif', 'font-size:14px',
    'z-index:99999', 'white-space:nowrap',
  ].join(';');

  banner.innerHTML = `
    <span>🔄 A new version is available</span>
    <button id="sw-update-btn" style="background:#4f46e5;color:#fff;border:none;
      padding:8px 16px;border-radius:6px;cursor:pointer;font-size:13px;font-weight:600;">
      Update Now
    </button>
    <button id="sw-dismiss-btn" style="background:transparent;color:#94a3b8;
      border:none;cursor:pointer;font-size:20px;line-height:1;padding:0 4px;">
      ×
    </button>
  `;
  document.body.appendChild(banner);

  document.getElementById('sw-update-btn').onclick = () => {
    if (registration.waiting) {
      // Listen for controller change before posting message
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        window.location.reload();
      }, { once: true });
      registration.waiting.postMessage('SKIP_WAITING');
    }
    banner.remove();
  };

  document.getElementById('sw-dismiss-btn').onclick = () => banner.remove();
}
