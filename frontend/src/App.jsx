// Zidnni/frontend/src/App.jsx
// Maqasid: حفظ العقل
//
// Root component. Holds language + conversationId state and applies the
// RTL/LTR direction to <html> whenever the language changes. Arabic is the
// default.

import { useEffect, useState } from 'react';
import Chat from './components/Chat.jsx';
import LanguageSwitch from './components/LanguageSwitch.jsx';
import ar from './i18n/ar.json';
import fr from './i18n/fr.json';
import en from './i18n/en.json';

const DICTS = { ar, fr, en };

export default function App() {
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
