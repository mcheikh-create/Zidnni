// frontend/src/pages/Auth.jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Auth() {
  const [step, setStep] = useState('phone'); // 'phone' | 'otp'
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [otp, setOtp] = useState('');
  const [isNew, setIsNew] = useState(true);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const fullPhone = `+222${phone}`;

  async function handlePhone(e) {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const endpoint = isNew ? '/api/auth/register' : '/api/auth/login';
      const body = isNew ? { phone: fullPhone, name, locale: 'ar' } : { phone: fullPhone };
      const r = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await r.json();
      if (!data.ok) { setError(data.error); return; }
      setStep('otp');
    } catch { setError('خطأ في الاتصال. حاول مجدداً.'); }
    finally { setLoading(false); }
  }

  async function handleOtp(e) {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const r = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: fullPhone, otp }),
      });
      const data = await r.json();
      if (!data.ok) { setError(data.error); return; }
      localStorage.setItem('zidnni_token', data.token);
      localStorage.setItem('zidnni_user', JSON.stringify(data.user));
      navigate('/chat');
    } catch { setError('خطأ في الاتصال. حاول مجدداً.'); }
    finally { setLoading(false); }
  }

  return (
    <div className="auth-page" dir="rtl">
      <div className="auth-card">
        <h1 className="auth-title">زدني</h1>
        <p className="auth-sub">رَبِّ زِدْنِي عِلْمًا</p>

        {step === 'phone' ? (
          <form className="auth-form" onSubmit={handlePhone}>
            <div className="auth-tabs">
              <button type="button" className={'auth-tab' + (isNew ? ' is-active' : '')} onClick={() => setIsNew(true)}>حساب جديد</button>
              <button type="button" className={'auth-tab' + (!isNew ? ' is-active' : '')} onClick={() => setIsNew(false)}>دخول</button>
            </div>
            {isNew && (
              <input className="auth-input" type="text" placeholder="الاسم الكامل" value={name} onChange={(e) => setName(e.target.value)} required dir="rtl" />
            )}
            <div className="auth-phone-row">
              <span className="auth-phone-prefix">🇲🇷 +222</span>
              <input className="auth-input auth-input--phone" type="tel" placeholder="XXXXXXXX" value={phone} onChange={(e) => setPhone(e.target.value)} required dir="ltr" />
            </div>
            {error && <p className="auth-error">{error}</p>}
            <button className="btn btn--primary btn--full" type="submit" disabled={loading}>
              {loading ? '...' : 'إرسال رمز التحقق'}
            </button>
          </form>
        ) : (
          <form className="auth-form" onSubmit={handleOtp}>
            <p className="auth-hint">أدخل رمز التحقق المرسل إلى {fullPhone}</p>
            <input className="auth-input auth-input--otp" type="text" inputMode="numeric" pattern="[0-9]*" maxLength={6} placeholder="_ _ _ _" value={otp} onChange={(e) => setOtp(e.target.value)} required dir="ltr" autoFocus />
            {error && <p className="auth-error">{error}</p>}
            <button className="btn btn--primary btn--full" type="submit" disabled={loading}>
              {loading ? '...' : 'تحقق ودخول'}
            </button>
            <button type="button" className="btn btn--ghost btn--full" onClick={() => setStep('phone')}>← تغيير الرقم</button>
          </form>
        )}
      </div>
    </div>
  );
}
