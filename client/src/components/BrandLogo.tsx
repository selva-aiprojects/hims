interface BrandLogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  light?: boolean;
}

export default function BrandLogo({ size = 'md', showText = true, light = false }: BrandLogoProps) {
  const height = size === 'sm' ? 28 : size === 'md' ? 48 : 72;
  
  return (
    <div style={{ display: 'flex', alignItems: 'center' }}>
      <img 
        src="/logo.png" 
        alt="Healthezee Logo" 
        style={{ 
          height: `${height}px`, 
          width: 'auto',
          display: 'block',
          filter: light ? 'brightness(0) invert(1)' : 'none' 
        }} 
      />
    </div>
  );
}
