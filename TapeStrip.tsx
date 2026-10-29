import React from 'react';

interface TapeStripProps {
  className?: string;
  width?: string;
  rotation?: string;
  variant?: 'cream' | 'brick' | 'marigold';
}

export const TapeStrip: React.FC<TapeStripProps> = ({
  className = '',
  width = 'w-24',
  rotation = '-rotate-2',
  variant = 'cream',
}) => {
  const variantStyles = {
    cream: 'bg-[#F2E5CE]/85 dark:bg-[#4D4336]/85 border-[#221F1A]/10 text-transparent',
    brick: 'bg-[#A83A2D]/25 dark:bg-[#A83A2D]/40 border-[#A83A2D]/20 text-transparent',
    marigold: 'bg-[#D9761C]/25 dark:bg-[#D9761C]/40 border-[#D9761C]/20 text-transparent',
  };

  return (
    <div
      className={`h-7 ${width} ${rotation} ${variantStyles[variant]} backdrop-blur-[1px] shadow-sm select-none pointer-events-none relative border-y border-dashed ${className}`}
      style={{
        clipPath: 'polygon(2% 0%, 98% 0%, 100% 100%, 0% 100%)',
      }}
    >
      {/* Subtle fiber line inside tape */}
      <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#000_1px,transparent_1px)] bg-[size:4px_4px]" />
    </div>
  );
};
