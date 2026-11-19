import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { registerPwaAutoUpdate } from './services/pwaUpdate';

registerPwaAutoUpdate();

const CURRENT_APP_VERSION = '1.0.1';
const VERSION_CHECK_URL = 'https://githubusercontent.com';

async function checkForAppUpdates() {
  try {
    if (!navigator.onLine) return;
    const res = await fetch(`${VERSION_CHECK_URL}?t=${Date.now()}`, { cache: 'no-store' });
    if (!res.ok) return;
    const data = await res.json();
    if (data.version && data.version !== CURRENT_APP_VERSION) {
      const banner = document.createElement('div');
      banner.style.cssText = 'position:fixed;bottom:14px;left:14px;right:14px;background:linear-gradient(135deg,#facc15,#ca8a04);color:#000;padding:12px 16px;border-radius:12px;font-weight:900;font-size:13px;z-index:99999;display:flex;justify-content:space-between;align-items:center;box-shadow:0 8px 25px rgba(0,0,0,0.85);direction:rtl;';
      banner.innerHTML = `<span>🔔 يتوفر تحديث جديد (${data.version})</span><a href="${data.downloadUrl || 'https://github.com'}" target="_blank" style="background:#000;color:#facc15;padding:6px 14px;border-radius:8px;text-decoration:none;font-weight:bold;">تحديث الآن</a>`;
      document.body.appendChild(banner);
    }
  } catch (e) {}
}

checkForAppUpdates();

createRoot(document.getElementById('root')!).render(<App />);

