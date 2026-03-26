// FumuGold V4 — Entry Point
import React, { useState, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { ClinicProvider } from './context/ClinicContext.jsx';
import LoginScreen from './screens/Login.jsx';
import AppInner from './screens/AppInner.jsx';
import { getSession } from './auth/supabaseAuth.js';

// Polyfill window.storage para compatibilidade
if (typeof window !== 'undefined' && !window.storage) {
  window.storage = {
    get: async (key) => {
      try { const v = localStorage.getItem(key); return v ? { key, value: v } : null; } catch { return null; }
    },
    set: async (key, value) => {
      try { localStorage.setItem(key, value); return { key, value }; } catch { return null; }
    },
    delete: async (key) => {
      try { localStorage.removeItem(key); return { key, deleted: true }; } catch { return null; }
    },
    list: async (prefix = '') => {
      try {
        const keys = Object.keys(localStorage).filter(k => k.startsWith(prefix));
        return { keys };
      } catch { return { keys: [] }; }
    },
  };
}

function App() {
  const [session, setSession] = useState(null);
  const [tab, setTab]         = useState('dashboard');
  const [checking, setChecking] = useState(true);
  const threeRef = useRef(null);

  useEffect(() => {
    getSession().then(s => {
      setSession(s);
      setChecking(false);
    });
  }, []);

  if (checking) {
    return (
      <div style={{ width: '100vw', height: '100vh', background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: '#D4AF37', fontFamily: 'monospace', fontSize: 13, letterSpacing: 2 }}>FUMUGOLD...</div>
      </div>
    );
  }

  if (!session) {
    return <LoginScreen onLogin={s => setSession(s)} />;
  }

  return (
    <ClinicProvider session={session} setTab={setTab} threeRef={threeRef}>
      <AppInner tab={tab} setTab={setTab} threeRef={threeRef} session={session} onLogout={() => setSession(null)} />
    </ClinicProvider>
  );
}

createRoot(document.getElementById('root')).render(<App />);
