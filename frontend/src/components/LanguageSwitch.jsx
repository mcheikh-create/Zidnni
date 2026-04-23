// Zidnni/frontend/src/components/LanguageSwitch.jsx
// Maqasid: حفظ العقل

import { useEffect } from 'react';

export default function LanguageSwitch({ lang, onChange, t }) {
  useEffect(() => {
    const saved = localStorage.getItem('interfaceLang');
    if (saved && saved !== lang) onChange(saved);
  }, []);

  function handleChange(e) {
    const next = e.target.value;
    localStorage.setItem('interfaceLang', next);
    onChange(next);
  }

  return (
    <div className="lang-switch">
      <label className="lang-switch__label">{t.lang.switch}</label>
      <select
        className="lang-switch__select"
        value={lang}
        onChange={handleChange}
        dir="auto"
      >
        <option value="ar">{t.lang.ar}</option>
        <option value="fr">{t.lang.fr}</option>
        <option value="en">{t.lang.en}</option>
      </select>
    </div>
  );
}
