interface BrandLogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  light?: boolean;
}

export default function BrandLogo({ size = 'md', showText = true, light = false }: BrandLogoProps) {
  const iconSize = size === 'sm' ? 24 : size === 'md' ? 40 : 64;
  const fontSize = size === 'sm' ? 18 : size === 'md' ? 28 : 42;
  const textColor = light ? 'white' : '#0f172a';
  const tealColor = '#0d9488';

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
      {/* The Circular Icon */}
      <svg width={iconSize} height={iconSize} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="50" cy="50" r="50" fill="#1e293b" />
        {/* The H Shape */}
        <path d="M35 30V70M65 30V70M35 50H65" stroke="url(#h-gradient)" strokeWidth="12" strokeLinecap="round" />
        {/* The Pulse Line */}
        <path d="M60 65H70L75 55L82 75L88 65H95" stroke={tealColor} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        {/* The Checkmark */}
        <path d="M45 45L55 55L75 35" stroke="#10b981" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
        
        <defs>
          <linearGradient id="h-gradient" x1="35" y1="30" x2="65" y2="70" gradientUnits="userSpaceOnUse">
            <stop stopColor="#5eead4" />
            <stop offset="1" stopColor="#0d9488" />
          </linearGradient>
        </defs>
      </svg>

      {/* The Healthezee Text */}
      {showText && (
        <div style={{ display: 'flex', alignItems: 'baseline' }}>
          <span style={{ 
            color: textColor, 
            fontSize: fontSize, 
            fontWeight: 900, 
            letterSpacing: '-1px',
            fontFamily: "'Inter', sans-serif"
          }}>
            Health
          </span>
          <span style={{ 
            color: tealColor, 
            fontSize: fontSize, 
            fontWeight: 900, 
            letterSpacing: '-1px',
            fontFamily: "'Inter', sans-serif"
          }}>
            ezee
          </span>
        </div>
      )}
    </div>
  );
}
