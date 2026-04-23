// frontend/src/components/UpgradePrompt.jsx
import { useNavigate } from 'react-router-dom';

export default function UpgradePrompt({ message }) {
  const navigate = useNavigate();
  return (
    <div className="upgrade-prompt" dir="rtl">
      <p className="upgrade-prompt__msg">
        {message || 'اقتربت من حد رسائلك اليومية.'}
      </p>
      <button className="btn btn--primary" onClick={() => navigate('/#pricing')}>
        ترقية الحساب →
      </button>
    </div>
  );
}
