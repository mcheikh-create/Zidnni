// frontend/src/App.jsx
// Maqasid: حفظ العقل
import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Landing from './pages/Landing.jsx';
import Auth from './pages/Auth.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Chat from './components/Chat.jsx';
import LanguageSwitch from './components/LanguageSwitch.jsx';
import ar from './i18n/ar.json';
import fr from './i18n/fr.json';
import en from './i18n/en.json';

const DICTS = { ar, fr, en };

function ChatShell() {
  const [lang, setLang] = useState('ar');
  const [conversationId, setConversationId] = useState(null);
  const t = DICTS[lang];

  useEffect(() => {
    document.documentElement.lang = t.meta.code;
    document.documentElement.dir = t.meta.dir;
  }, [lang, t]);

  useEffect(() => {
    fetch('/api/auth', { method: 'POST' })
      .then((r) => r.json())
      .then((data) => setConversationId(data.conversationId))
      .catch(() => setConversationId(crypto.randomUUID()));
  }, []);

  return (
    <div className="app">
      <header className="app-header">
        <div className="brand">
          <h1 className="brand-title">{t.app.title}</h1>
          <p className="brand-tagline">{t.app.tagline}</p>
          <p className="brand-subtitle">{t.app.subtitle}</p>
        </div>
        <LanguageSwitch lang={lang} onChange={setLang} t={t} />
      </header>
      <main className="app-main">
        {conversationId ? (
          <Chat conversationId={conversationId} lang={lang} t={t} />
        ) : (
          <p className="status">{t.chat.thinking}</p>
        )}
      </main>
    </div>
  );
}

function RequireAuth({ children }) {
  const token = localStorage.getItem('zidnni_token');
  return token ? children : <Navigate to="/auth" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/dashboard" element={<RequireAuth><Dashboard /></RequireAuth>} />
        <Route path="/chat" element={<RequireAuth><ChatShell /></RequireAuth>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
