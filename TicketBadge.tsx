import React from 'react';

interface TicketBadgeProps {
  stat: string;
  label: string;
  badgeNumber?: string;
  rotation?: string;
  className?: string;
}

export const TicketBadge: React.FC<TicketBadgeProps> = ({
  stat,
  label,
  badgeNumber = 'ADMIT-1',
  rotation = 'rotate-0',
  className = '',
}) => {
  return (
    <div
      className={`relative group bg-[#FBF6EA] dark:bg-[#272420] border border-[#221F1A]/25 dark:border-[#EDE6D8]/20 px-5 py-4 shadow-[2px_3px_8px_rgba(34,31,26,0.08)] dark:shadow-[2px_3px_8px_rgba(0,0,0,0.4)] ${rotation} transition-transform hover:-translate-y-0.5 hover:rotate-0 ${className}`}
    >
      {/* Ticket Cutout Notches */}
      <div
        className="absolute -left-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-[#E7DCC3] dark:bg-[#1B1916] border-r border-[#221F1A]/25 dark:border-[#EDE6D8]/20"
        aria-hidden="true"
      />
      <div
        className="absolute -right-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-[#E7DCC3] dark:bg-[#1B1916] border-l border-[#221F1A]/25 dark:border-[#EDE6D8]/20"
        aria-hidden="true"
      />

      {/* Ticket Header Stub */}
      <div className="flex items-center justify-between text-[11px] font-heading tracking-widest text-[#4A4436]/70 dark:text-[#B8B0A0]/70 pb-2 mb-2 border-b border-dashed border-[#221F1A]/20 dark:border-[#EDE6D8]/15">
        <span className="uppercase">FEST STAT</span>
        <span className="font-mono text-[10px]">{badgeNumber}</span>
      </div>

      {/* Stat and Label */}
      <div className="flex flex-col gap-1">
        <div className="text-xl sm:text-2xl font-bold font-heading text-[#221F1A] dark:text-[#EDE6D8] tracking-tight">
          {stat}
        </div>
        <div className="text-sm font-serif text-[#4A4436] dark:text-[#B8B0A0] leading-snug">
          {label}
        </div>
      </div>
    </div>
  );
};
