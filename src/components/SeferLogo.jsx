export default function SeferLogo({ size = 36 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      xmlns="http://www.w3.org/2000/svg"
      style={{ borderRadius: size * 0.22, flexShrink: 0 }}
    >
      <defs>
        <linearGradient id="sl-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#2d1b69"/>
          <stop offset="100%" stopColor="#1a3a6b"/>
        </linearGradient>
        <linearGradient id="sl-goldV" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#fde68a"/>
          <stop offset="50%"  stopColor="#f59e0b"/>
          <stop offset="100%" stopColor="#b45309"/>
        </linearGradient>
        <linearGradient id="sl-goldH" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%"   stopColor="#b45309"/>
          <stop offset="50%"  stopColor="#f59e0b"/>
          <stop offset="100%" stopColor="#b45309"/>
        </linearGradient>
        <linearGradient id="sl-scroll" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#f5f0e8"/>
          <stop offset="100%" stopColor="#e8e0ce"/>
        </linearGradient>
        <filter id="sl-glow">
          <feGaussianBlur stdDeviation="1.5" result="blur"/>
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>

      {/* Background */}
      <rect width="100" height="100" rx="22" fill="url(#sl-bg)"/>
      <ellipse cx="30" cy="30" rx="35" ry="35" fill="rgba(139,92,246,0.15)"/>
      <ellipse cx="75" cy="75" rx="28" ry="28" fill="rgba(56,189,248,0.1)"/>

      {/* Scroll: left cylinder */}
      <rect x="11" y="39" width="15" height="22" rx="7.5" fill="url(#sl-scroll)"/>
      <line x1="15.5" y1="40" x2="15.5" y2="60" stroke="rgba(160,140,100,0.45)" strokeWidth="1.5"/>
      <line x1="19"   y1="40" x2="19"   y2="60" stroke="rgba(160,140,100,0.3)"  strokeWidth="1"/>

      {/* Scroll: parchment body */}
      <rect x="26" y="42" width="48" height="16" fill="url(#sl-scroll)"/>
      <line x1="30" y1="46.5" x2="70" y2="46.5" stroke="rgba(140,120,80,0.3)" strokeWidth="0.9"/>
      <line x1="30" y1="50"   x2="70" y2="50"   stroke="rgba(140,120,80,0.3)" strokeWidth="0.9"/>
      <line x1="30" y1="53.5" x2="70" y2="53.5" stroke="rgba(140,120,80,0.3)" strokeWidth="0.9"/>

      {/* Scroll: right cylinder */}
      <rect x="74" y="39" width="15" height="22" rx="7.5" fill="url(#sl-scroll)"/>
      <line x1="78.5" y1="40" x2="78.5" y2="60" stroke="rgba(160,140,100,0.45)" strokeWidth="1.5"/>
      <line x1="82"   y1="40" x2="82"   y2="60" stroke="rgba(160,140,100,0.3)"  strokeWidth="1"/>

      {/* Cross: vertical bar */}
      <rect x="44.5" y="17" width="11" height="66" rx="3" fill="url(#sl-goldV)" filter="url(#sl-glow)"/>
      {/* Cross: horizontal bar */}
      <rect x="27"   y="42" width="46" height="16" rx="3" fill="url(#sl-goldH)" filter="url(#sl-glow)"/>
      {/* Intersection highlight */}
      <rect x="44.5" y="42" width="11" height="16" rx="2" fill="rgba(255,240,180,0.35)"/>

      {/* Serif caps */}
      <rect x="41" y="17" width="18" height="4" rx="2" fill="url(#sl-goldH)"/>
      <rect x="41" y="79" width="18" height="4" rx="2" fill="url(#sl-goldH)"/>
    </svg>
  );
}
