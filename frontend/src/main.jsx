import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AccountsProvider } from './context/AccountsContext';
import Login from './pages/Login';
import Ledger from './pages/Ledger';
import Entry from './pages/Entry';
import Assets from './pages/Assets';
import Stats from './pages/Stats';
import './index.css';

function RequireAuth({ children }) {
  return localStorage.getItem('token') ? children : <Navigate to="/login" replace />;
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AccountsProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<RequireAuth><Ledger /></RequireAuth>} />
          <Route path="/entry" element={<RequireAuth><Entry /></RequireAuth>} />
          <Route path="/assets" element={<RequireAuth><Assets /></RequireAuth>} />
          <Route path="/stats" element={<RequireAuth><Stats /></RequireAuth>} />
        </Routes>
      </BrowserRouter>
    </AccountsProvider>
  </StrictMode>
);
