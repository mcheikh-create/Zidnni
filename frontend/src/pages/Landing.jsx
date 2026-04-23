// frontend/src/pages/Landing.jsx
import { useNavigate } from 'react-router-dom';

const PLANS = [
  {
    id: 'free',
    nameAr: 'زدني الحر',
    priceMRU: 0,
    priceUSD: 0,
    badge: null,
    features: ['20 رسالة يومياً', 'محادثة نصية', 'العربية والفرنسية والحسانية'],
  },
  {
    id: 'personal',
    nameAr: 'زدني الشخصي',
    priceMRU: 500,
    priceUSD: 9.99,
    badge: 'الأكثر شعبية',
    features: ['رسائل غير محدودة', 'واتساب', 'إدخال صوتي', 'تحليل المستندات', 'تحليل الصور'],
  },
  {
    id: 'business',
    nameAr: 'زدني الأعمال',
    priceMRU: 2000,
    priceUSD: 49,
    badge: null,
    features: ['كل مميزات الشخصي', '5 أعضاء فريق', 'قاعدة معرفة مخصصة', 'وصول API', 'لوحة تحليلات'],
  },
];

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="landing" dir="rtl">
      <header className="landing__header">
        <div className="landing__brand">
          <h1 className="landing__title">زدني</h1>
          <p className="landing__ayah">رَبِّ زِدْنِي عِلْمًا</p>
          <p className="landing__tagline">ذكاء اصطناعي لموريتانيا والعالم العربي</p>
        </div>
        <div className="landing__header-actions">
          <button className="btn btn--ghost" onClick={() => navigate('/auth')}>تسجيل الدخول</button>
        </div>
      </header>

      <section className="landing__hero">
        <div className="landing__hero-pattern" aria-hidden="true" />
        <h1 className="landing__hero-brand">زدني</h1>
        <p className="landing__hero-ayah">رَبِّ زِدْنِي عِلْمًا</p>
        <h2 className="landing__hero-title">مساعدك الذكي بالعربية أولاً</h2>
        <p className="landing__hero-sub">
          زدني يفهم لهجتك، يخدم احتياجاتك، ويحترم قيمك.
          <br />
          مبني في موريتانيا. لكل العرب.
        </p>
        <button className="btn btn--primary btn--lg" onClick={() => navigate('/auth')}>
          ابدأ مجاناً ←
        </button>
      </section>

      <section className="landing__pricing" id="pricing">
        <h2 className="landing__section-title">اختر خطتك</h2>
        <div className="pricing-grid">
          {PLANS.map((plan) => (
            <div key={plan.id} className={'pricing-card' + (plan.badge ? ' pricing-card--highlight' : '')}>
              {plan.badge && <div className="pricing-card__badge">{plan.badge}</div>}
              <h3 className="pricing-card__name">{plan.nameAr}</h3>
              <div className="pricing-card__price">
                {plan.priceMRU === 0 ? (
                  <span className="pricing-card__amount">مجاناً</span>
                ) : (
                  <>
                    <span className="pricing-card__amount">{plan.priceMRU}</span>
                    <span className="pricing-card__currency"> أوقية/شهر</span>
                    <div className="pricing-card__usd">${plan.priceUSD}/mo للمغتربين</div>
                  </>
                )}
              </div>
              <ul className="pricing-card__features">
                {plan.features.map((f) => (
                  <li key={f}><span className="pricing-card__check">✓</span> {f}</li>
                ))}
              </ul>
              <button
                className={'btn btn--full' + (plan.badge ? ' btn--primary' : ' btn--outline')}
                onClick={() => navigate('/auth')}
              >
                {plan.priceMRU === 0 ? 'ابدأ مجاناً' : 'اشترك الآن'}
              </button>
            </div>
          ))}
        </div>
      </section>

      <footer className="landing__footer">
        <p>زدني © 2025 — صُنع في موريتانيا بنية خالصة</p>
      </footer>
    </div>
  );
}
