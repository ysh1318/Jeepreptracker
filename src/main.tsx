import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import ErrorBoundary from './ErrorBoundary.tsx';
import './index.css';

// Catches errors that happen OUTSIDE React's render (e.g. inside an async
// event handler's .catch, or a stray uncaught rejection) — the
// ErrorBoundary below only catches render-time crashes, so without this,
// those would just silently vanish into the console instead of showing up
// on screen. Same reasoning as ErrorBoundary.tsx: no practical console
// access on a phone-only workflow.
function showFatalOverlay(title: string, detail: string) {
  if (document.getElementById('fatal-error-overlay')) return; // don't stack multiple
  const el = document.createElement('div');
  el.id = 'fatal-error-overlay';
  el.style.cssText = 'position:fixed;inset:0;z-index:99999;background:#1b1c19;color:#f5f5f0;' +
    'font-family:monospace;font-size:13px;padding:20px;overflow:auto;white-space:pre-wrap;word-break:break-word;';
  el.innerHTML = `<h2 style="color:#ff8080;margin-bottom:12px;">${title}</h2>` +
    `<p style="margin-bottom:8px;">Screenshot this whole screen and send it back.</p>` +
    `<div style="background:#000;padding:12px;border-radius:8px;">${detail}</div>`;
  document.body.appendChild(el);
}

window.addEventListener('error', (event) => {
  showFatalOverlay('Uncaught error', `${event.message}\n\n${event.error?.stack || ''}`);
});

window.addEventListener('unhandledrejection', (event) => {
  const reason = event.reason;
  const detail = reason instanceof Error ? `${reason.message}\n\n${reason.stack}` : String(reason);
  showFatalOverlay('Unhandled promise rejection', detail);
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
