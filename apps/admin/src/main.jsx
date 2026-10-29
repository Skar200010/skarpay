import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import AdminKeyGate from './AdminKeyGate.jsx';
import './apiFetch.js';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AdminKeyGate>
      <App />
    </AdminKeyGate>
  </React.StrictMode>
);
