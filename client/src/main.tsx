import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import { AdminApp } from './admin/AdminApp';
import './styles.css';

// The app has no router; the admin panel is the one other surface. The server's
// SPA fallback serves index.html for /admin, so a path check is enough.
const isAdmin = window.location.pathname.startsWith('/admin');

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>{isAdmin ? <AdminApp /> : <App />}</React.StrictMode>,
);
