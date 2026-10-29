import React from 'react';
import { PushPin } from './PushPin';

export const Footer: React.FC = () => {
  return (
    <footer className="border-t border-[#221F1A]/15 dark:border-[#EDE6D8]/15 bg-[#E7DCC3]/80 dark:bg-[#1B1916]/80 py-12 px-4 sm:px-6 transition-colors">
      <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6 text-center sm:text-left">
        {/* Brand & pin */}
        <div className="flex items-center gap-2.5">
          <span className="w-3 h-3 rounded-full bg-[#A83A2D] inline-block shadow-sm" />
          <span className="font-heading font-bold text-xl tracking-tight text-[#221F1A] dark:text-[#EDE6D8]">
            SponsrMitra
          </span>
        </div>

        {/* Copy note */}
        <p className="font-serif italic text-sm text-[#4A4436] dark:text-[#B8B0A0] max-w-md">
          Built for the fest team pulling three all-nighters before the sponsor deck is due.
        </p>

        {/* Noticeboard Tag */}
        <div className="text-xs font-mono text-[#4A4436]/60 dark:text-[#B8B0A0]/60">
          INDIA CAMPUS NETWORK • 2026
        </div>
      </div>
    </footer>
  );
};
