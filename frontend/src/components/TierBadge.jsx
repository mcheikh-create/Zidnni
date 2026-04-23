// frontend/src/components/TierBadge.jsx
const TIERS = {
  free:     { label: 'حر',    color: '#7b82a0' },
  personal: { label: 'شخصي', color: '#0d7377' },
  business: { label: 'أعمال', color: '#d4a017' },
};

export default function TierBadge({ tier = 'free' }) {
  const { label, color } = TIERS[tier] || TIERS.free;
  return (
    <span className="tier-badge" style={{ background: color + '22', color, borderColor: color + '55' }}>
      {label}
    </span>
  );
}
