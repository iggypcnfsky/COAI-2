import React from 'react';

interface LogoProps {
  /** Size in pixels or CSS units */
  size?: number | string;
  /** Color of the logo circles */
  color?: string;
  /** Additional CSS classes */
  className?: string;
  /** Alt text for accessibility */
  alt?: string;
}

const Logo: React.FC<LogoProps> = ({ 
  size = 32, 
  color = '#6b7280', 
  className = '', 
  alt = 'COAI Logo' 
}) => {
  const sizeValue = typeof size === 'number' ? `${size}px` : size;

  return (
    <svg 
      width={sizeValue}
      height={sizeValue}
      viewBox="0 0 372 372" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label={alt}
    >
      <circle cx="183.304" cy="185.436" r="75.0138" fill={color}/>
      <circle cx="45.1211" cy="186" r="45.1211" fill={color}/>
      <circle cx="86.8579" cy="86.7339" r="45.1211" fill={color}/>
      <circle cx="280.879" cy="285.267" r="45.1211" fill={color}/>
      <circle cx="183.868" cy="46.1245" r="45.1211" fill={color}/>
      <circle cx="280.879" cy="86.7339" r="45.1211" fill={color}/>
      <circle cx="86.8579" cy="285.267" r="45.1211" fill={color}/>
      <circle cx="183.868" cy="325.875" r="45.1211" fill={color}/>
    </svg>
  );
};

export default Logo; 