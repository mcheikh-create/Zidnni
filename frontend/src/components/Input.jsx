// Zidnni/frontend/src/components/Input.jsx
// Maqasid: حفظ العقل

import { useState } from 'react';

export default function Input({ onSend, disabled, t, lang }) {
  const [value, setValue] = useState('');
  const dir = lang === 'ar' ? 'rtl' : 'ltr';

  function handleSubmit(e) {
    e.preventDefault();
    const text = value.trim();
    if (!text || disabled) return;
    onSend(text);
    setValue('');
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) handleSubmit(e);
  }

  return (
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
      <button
        type="submit"
        className="input-send"
        disabled={disabled || !value.trim()}
        aria-label={t.chat.send}
      >
        {disabled ? '…' : t.chat.send}
      </button>
    </form>
  );
}
