interface BrandLogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  light?: boolean;
}

export default function BrandLogo({ size = 'md' }: BrandLogoProps) {
  const height = size === 'sm' ? 28 : size === 'md' ? 48 : 72;
  const customLogo = localStorage.getItem('theme_logo_url');
  
  return (
    <div style={{ display: 'flex', alignItems: 'center' }}>
      <img 
        src={customLogo || "/logo.png"} 
        alt="Healthezee Logo" 
        style={{ 
          height: `${height}px`, 
          width: 'auto',
          display: 'block',
          borderRadius: '8px'
        }} 
      />
    </div>
  );
}
