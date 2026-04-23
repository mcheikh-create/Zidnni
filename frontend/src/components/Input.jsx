// Zidnni/frontend/src/components/Input.jsx
// Maqasid: حفظ العقل

import { useState } from 'react';
import ArabicKeyboard from './ArabicKeyboard.jsx';

export default function Input({ onSend, disabled, t, lang }) {
  const [value, setValue] = useState('');
  const [showKeyboard, setShowKeyboard] = useState(false);
  const dir = lang === 'ar' ? 'rtl' : 'ltr';

  function handleSubmit(e) {
    e.preventDefault();
    const text = value.trim();
    if (!text || disabled) return;
    onSend(text);
    setValue('');
    setShowKeyboard(false);
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) handleSubmit(e);
  }

  function handleArabicKey(key) {
    if (key === '⌫') {
      setValue((prev) => [...prev].slice(0, -1).join(''));
    } else {
      setValue((prev) => prev + key);
    }
  }

  return (
    <div className="input-wrapper">
      <form className="input-form" onSubmit={handleSubmit} dir={dir}>
        <textarea
          className="input-field"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={t.chat.placeholder}
          disabled={disabled}
          rows={1}
          dir={dir}
          aria-label={t.chat.placeholder}
        />
        {lang === 'ar' && (
          <button
            type="button"
            className={'input-kbd-toggle' + (showKeyboard ? ' is-active' : '')}
            onClick={() => setShowKeyboard((v) => !v)}
            aria-label="لوحة المفاتيح العربية"
            title="لوحة المفاتيح العربية"
          >
            ⌨
          </button>
        )}
        <button
          type="submit"
          className="input-send"
          disabled={disabled || !value.trim()}
          aria-label={t.chat.send}
        >
          {disabled ? '…' : t.chat.send}
        </button>
      </form>

      {lang === 'ar' && showKeyboard && (
        <ArabicKeyboard onKey={handleArabicKey} onClose={() => setShowKeyboard(false)} />
      )}
    </div>
  );
}
