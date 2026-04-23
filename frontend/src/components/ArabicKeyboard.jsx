// Zidnni/frontend/src/components/ArabicKeyboard.jsx
// Maqasid: حفظ العقل — on-screen Arabic keyboard for touchscreen / keyboardless users

const ROWS = [
  ['ض','ص','ث','ق','ف','غ','ع','ه','خ','ح','ج','د','⌫'],
  ['ش','س','ي','ب','ل','ا','ت','ن','م','ك','ط'],
  ['ئ','ء','ؤ','ر','لا','ى','ة','و','ز','ظ','ذ'],
  ['،','.','؟','!',' '],
];

export default function ArabicKeyboard({ onKey, onClose }) {
  return (
    <div className="arabic-keyboard" dir="rtl" role="toolbar" aria-label="لوحة المفاتيح العربية">
      <div className="kbd-header">
        <span className="kbd-title">⌨ لوحة المفاتيح</span>
        <button type="button" className="kbd-close" onClick={onClose} aria-label="إغلاق لوحة المفاتيح">
          ✕
        </button>
      </div>

      {ROWS.map((row, ri) => (
        <div className="kbd-row" key={ri}>
          {row.map((key) => {
            const isBackspace = key === '⌫';
            const isSpace     = key === ' ';
            const isLamAlef   = key === 'لا';
            const cls = [
              'kbd-key',
              isBackspace ? 'kbd-key--action' : '',
              isSpace     ? 'kbd-key--space'  : '',
              isLamAlef   ? 'kbd-key--wide'   : '',
            ].filter(Boolean).join(' ');

            return (
              <button
                key={key}
                type="button"
                className={cls}
                onPointerDown={(e) => { e.preventDefault(); onKey(key); }}
                aria-label={isSpace ? 'مسافة' : isBackspace ? 'حذف' : key}
              >
                {isSpace ? 'مسافة' : key}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}
