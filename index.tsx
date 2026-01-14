import React from 'react';
import ReactDOM from 'react-dom/client';

// エラーハンドラーをインポート
import { initErrorHandler } from './src/lib/errorHandler';

// グローバルエラーハンドラーを初期化（AbortErrorをフィルタリング）
initErrorHandler();

// Global error handler（既存のロギング用）
window.addEventListener('error', (event) => {
  // AbortErrorは無視
  if (event.error?.name === 'AbortError') {
    return;
  }
});

window.addEventListener('unhandledrejection', (event) => {
  // AbortErrorは無視
  if (event.reason?.name === 'AbortError') {
    return;
  }
});

import App from './App';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
