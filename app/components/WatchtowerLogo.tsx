'use client';

export function WatchtowerLogo({ className = "h-10 w-10" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 100 100"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        {/* Stone texture gradient */}
        <linearGradient id="stoneGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style={{ stopColor: '#8B7E74', stopOpacity: 1 }} />
          <stop offset="50%" style={{ stopColor: '#A89F94', stopOpacity: 1 }} />
          <stop offset="100%" style={{ stopColor: '#6B5D52', stopOpacity: 1 }} />
        </linearGradient>
        
        {/* Darker stone for shadows */}
        <linearGradient id="stoneDark" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" style={{ stopColor: '#6B5D52', stopOpacity: 1 }} />
          <stop offset="100%" style={{ stopColor: '#5A4D42', stopOpacity: 1 }} />
        </linearGradient>

        {/* Spark animation */}
        <radialGradient id="sparkGradient">
          <stop offset="0%" style={{ stopColor: '#FFE5B4', stopOpacity: 1 }} />
          <stop offset="50%" style={{ stopColor: '#FFD700', stopOpacity: 0.8 }} />
          <stop offset="100%" style={{ stopColor: '#FFA500', stopOpacity: 0 }} />
        </radialGradient>
      </defs>

      {/* Tower base - wider */}
      <rect
        x="30"
        y="65"
        width="40"
        height="30"
        fill="url(#stoneGradient)"
        stroke="#5A4D42"
        strokeWidth="1"
      />

      {/* Main tower body */}
      <rect
        x="35"
        y="25"
        width="30"
        height="40"
        fill="url(#stoneGradient)"
        stroke="#5A4D42"
        strokeWidth="1"
      />

      {/* Stone texture lines - horizontal */}
      <line x1="35" y1="35" x2="65" y2="35" stroke="#5A4D42" strokeWidth="0.5" opacity="0.6" />
      <line x1="35" y1="45" x2="65" y2="45" stroke="#5A4D42" strokeWidth="0.5" opacity="0.6" />
      <line x1="35" y1="55" x2="65" y2="55" stroke="#5A4D42" strokeWidth="0.5" opacity="0.6" />
      <line x1="30" y1="75" x2="70" y2="75" stroke="#5A4D42" strokeWidth="0.5" opacity="0.6" />
      <line x1="30" y1="85" x2="70" y2="85" stroke="#5A4D42" strokeWidth="0.5" opacity="0.6" />

      {/* Stone texture lines - vertical */}
      <line x1="45" y1="25" x2="45" y2="65" stroke="#5A4D42" strokeWidth="0.5" opacity="0.4" />
      <line x1="55" y1="25" x2="55" y2="65" stroke="#5A4D42" strokeWidth="0.5" opacity="0.4" />

      {/* Window/arrow slit */}
      <rect
        x="47"
        y="40"
        width="6"
        height="15"
        fill="#2C2416"
        stroke="#1A1410"
        strokeWidth="0.5"
      />

      {/* Crenellations (battlements) at the top */}
      <rect x="35" y="20" width="6" height="5" fill="url(#stoneDark)" stroke="#5A4D42" strokeWidth="0.5" />
      <rect x="47" y="20" width="6" height="5" fill="url(#stoneDark)" stroke="#5A4D42" strokeWidth="0.5" />
      <rect x="59" y="20" width="6" height="5" fill="url(#stoneDark)" stroke="#5A4D42" strokeWidth="0.5" />
      
      {/* Merlon gaps (the gaps between battlements) */}
      <rect x="41" y="20" width="6" height="5" fill="none" />
      <rect x="53" y="20" width="6" height="5" fill="none" />

      {/* Spark effect at the top (animated) */}
      <circle
        cx="50"
        cy="15"
        r="3"
        fill="url(#sparkGradient)"
        className="watchtower-spark"
      />
    </svg>
  );
}
