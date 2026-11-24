import React from 'react';
import ReactDOM from 'react-dom/client';
import { ConvexProvider } from 'convex/react';
import { convexClient, convexConfigError } from './convexClient';
import './index.css';

const root = ReactDOM.createRoot(document.getElementById('root')!);

if (convexConfigError) {
  root.render(
    <div className="min-h-screen flex items-center justify-center bg-canvas p-6">
      <div role="alert" className="card max-w-md w-full p-8 space-y-2">
        <h1 className="page-title">Codex não pôde iniciar</h1>
        <p className="text-sm text-fg-muted leading-relaxed">{convexConfigError}</p>
      </div>
    </div>
  );
} else {
  // Importação dinâmica: a store só é carregada quando há um backend configurado.
  void import('./App').then(({ default: App }) => {
    root.render(
      <React.StrictMode>
        <ConvexProvider client={convexClient}>
          <App />
        </ConvexProvider>
      </React.StrictMode>
    );
  });
}
