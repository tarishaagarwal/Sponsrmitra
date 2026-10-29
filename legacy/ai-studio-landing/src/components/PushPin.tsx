import React from 'react';

interface PushPinProps {
  color?: 'brick' | 'teal' | 'marigold' | 'brass';
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const PushPin: React.FC<PushPinProps> = ({
  color = 'brick',
  className = '',
  size = 'md',
}) => {
  const colorMap = {
    brick: {
      head: '#A83A2D',
      highlight: '#D85A4C',
      shadow: '#6A231A',
    },
    teal: {
      head: '#1F5C56',
      highlight: '#3A8A82',
      shadow: '#123935',
    },
    marigold: {
      head: '#D9761C',
      highlight: '#F39C46',
      shadow: '#944E0E',
    },
    brass: {
      head: '#C29A38',
      highlight: '#E5C065',
      shadow: '#7F621D',
    },
  };

  const selected = colorMap[color];
  const sizeMap = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  };

  return (
    <div className={`relative inline-block select-none pointer-events-none ${className}`}>
      {/* Pin head with 3D bevel and metallic highlight */}
      <svg
        className={sizeMap[size]}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{
          filter: 'drop-shadow(1px 2px 2px rgba(0, 0, 0, 0.35))',
        }}
      >
        {/* Outer rim */}
        <circle cx="12" cy="12" r="10" fill={selected.shadow} />
        {/* Main bulb */}
        <circle cx="12" cy="12" r="8" fill={selected.head} />
        {/* Specular highlight */}
        <circle cx="10" cy="10" r="4" fill={selected.highlight} opacity="0.8" />
        <ellipse cx="9" cy="9" rx="2" ry="1.2" fill="#FFFFFF" opacity="0.9" />
        {/* Center pin depression */}
        <circle cx="12" cy="12" r="1.5" fill={selected.shadow} opacity="0.7" />
      </svg>
    </div>
  );
};
