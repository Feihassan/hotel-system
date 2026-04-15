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
    navigator.serviceWorker.register('/sw.js').then((registration) => {

      // New SW waiting — show update banner
      const onUpdateFound = () => {
        const newWorker = registration.installing;
        if (!newWorker) return;
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            showUpdateBanner(registration);
          }
        });
      };

      registration.addEventListener('updatefound', onUpdateFound);

      // Check for updates every 60 seconds
      setInterval(() => registration.update(), 60000);

    }).catch((err) => console.warn('SW registration failed:', err));

    // When SW activates a new version, reload all clients
    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!refreshing) {
        refreshing = true;
        window.location.reload();
      }
    });
  });
}

function showUpdateBanner(registration) {
  // Remove existing banner if any
  const existing = document.getElementById('sw-update-banner');
  if (existing) existing.remove();

  const banner = document.createElement('div');
  banner.id = 'sw-update-banner';
  banner.style.cssText = `
    position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%);
    background: #1e293b; color: white; padding: 14px 20px;
    border-radius: 10px; box-shadow: 0 4px 20px rgba(0,0,0,0.3);
    display: flex; align-items: center; gap: 16px;
    font-family: Inter, sans-serif; font-size: 14px;
    z-index: 99999; white-space: nowrap;
  `;
  banner.innerHTML = `
    <span>🔄 A new version is available</span>
    <button id="sw-reload-btn" style="
      background: #4f46e5; color: white; border: none;
      padding: 8px 16px; border-radius: 6px; cursor: pointer;
      font-size: 13px; font-weight: 600;
    ">Update Now</button>
    <button id="sw-dismiss-btn" style="
      background: transparent; color: #94a3b8; border: none;
      cursor: pointer; font-size: 18px; line-height: 1;
    ">×</button>
  `;
  document.body.appendChild(banner);

  document.getElementById('sw-reload-btn').addEventListener('click', () => {
    if (registration.waiting) {
      registration.waiting.postMessage('SKIP_WAITING');
    }
    banner.remove();
  });

  document.getElementById('sw-dismiss-btn').addEventListener('click', () => banner.remove());
}
