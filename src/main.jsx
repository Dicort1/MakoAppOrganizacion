import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/global.css';
import { seedIfEmpty } from './db/db';

// Seed the database BEFORE React renders so the employee list is never empty
seedIfEmpty().then(() => {
  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
});
