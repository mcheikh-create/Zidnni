// frontend/src/pages/Dashboard.jsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import TierBadge from '../components/TierBadge.jsx';
import UpgradePrompt from '../components/UpgradePrompt.jsx';

export default function Dashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [usage, setUsage] = useState(null);

  const token = localStorage.getItem('zidnni_token');

  useEffect(() => {
    if (!token) { navigate('/auth'); return; }
    const headers = { Authorization: `Bearer ${token}` };
    Promise.all([
      fetch('/api/auth/me', { headers }).then((r) => r.json()),
      fetch('/api/user/usage', { headers }).then((r) => r.json()),
    ]).then(([me, usageData]) => {
      if (!me.ok) { navigate('/auth'); return; }
      setUser(me.user);
      setUsage(usageData);
    });
  }, []);

  if (!user) return <div className="status" dir="rtl">جاري التحميل...</div>;

  const isFree = user.tier === 'free';
  const usedToday = usage?.daily?.message_count || 0;
  const limit = 20;
  const pct = isFree ? Math.min(100, (usedToday / limit) * 100) : 0;
  const nearLimit = isFree && usedToday >= 15;

  return (
    <div className="dashboard" dir="rtl">
      <header className="dash-header">
        <h1 className="dash-title">زدني</h1>
        <TierBadge tier={user.tier} />
      </header>

      <div className="dash-body">
        <div className="dash-card">
          <p className="dash-greeting">مرحباً، {user.name}</p>
          <button className="btn btn--primary" onClick={() => navigate('/chat')}>
            ابدأ محادثة →
          </button>
        </div>

        {isFree && (
          <div className="dash-card">
            <p className="dash-label">الرسائل اليومية</p>
            <div className="usage-bar">
              <div className="usage-bar__fill" style={{ width: `${pct}%`, background: nearLimit ? '#e74c3c' : 'var(--color-accent)' }} />
            </div>
            <p className="dash-usage-text">{usedToday} / {limit} رسالة</p>
          </div>
        )}

        {nearLimit && <UpgradePrompt />}

        <div className="dash-card dash-stats">
          <div className="dash-stat">
            <span className="dash-stat__value">{usage?.monthly?.message_count || 0}</span>
            <span className="dash-stat__label">رسالة هذا الشهر</span>
          </div>
        </div>

        <button className="btn btn--ghost" onClick={() => { localStorage.clear(); navigate('/'); }}>
          تسجيل الخروج
        </button>
      </div>
    </div>
  );
}
