import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';

// Suppress benign ResizeObserver loop error (common with charts/layout; does not affect behavior)
// Use capture phase so we handle it before React's error overlay
window.addEventListener('error', (e) => {
  if (e.message?.includes?.('ResizeObserver loop') || e.message?.includes?.('ResizeObserver')) {
    e.stopImmediatePropagation();
    e.preventDefault();
    return true;
  }
}, true);

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
