import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import '@fontsource/inter/400.css';
import '@fontsource/inter/600.css';
import './styles.css';
import App from './App';

function BrowserMode() {
  return <div className="browser-mode">
    <div className="browser-mode-card">
      <div className="browser-mode-brand">CS</div>
      <p className="browser-mode-eyebrow">Certificate Studio</p>
      <h1>The interface is ready</h1>
      <p>This localhost page is the React renderer. Certificate Studio’s database, native file picker, PDF generator, encrypted credentials, and email service run inside Electron and are intentionally unavailable to a normal browser.</p>
      <div className="browser-mode-command">
        <span>Launch the complete application</span>
        <code>npm run dev</code>
      </div>
      <p className="browser-mode-help">Run that command from <code>C:\projects\Automation-certificates-webinterface</code>. The desktop window will open automatically.</p>
    </div>
  </div>;
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>{window.studio?<HashRouter><App/></HashRouter>:<BrowserMode/>}</React.StrictMode>
);
