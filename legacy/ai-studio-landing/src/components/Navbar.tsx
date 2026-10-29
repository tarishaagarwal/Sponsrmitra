import React, { useState } from 'react';
import { PushPin } from './PushPin';
import { Sun, Moon, Table } from 'lucide-react';
import { getStoredSheetInfo } from '../services/sheetsService';

interface NavbarProps {
  darkMode: boolean;
  onToggleDarkMode: () => void;
  onScrollToWaitlist: (role?: 'Organiser' | 'Sponsor') => void;
  currentUserEmail?: string | null;
}

export const Navbar: React.FC<NavbarProps> = ({
  darkMode,
  onToggleDarkMode,
  onScrollToWaitlist,
  currentUserEmail,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const sheetInfo = getStoredSheetInfo();

  const handleNavClick = (id: string) => {
    setMobileMenuOpen(false);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <header className="sticky top-0 z-50 bg-[#E7DCC3]/95 dark:bg-[#1B1916]/95 backdrop-blur-md border-b border-[#221F1A]/15 dark:border-[#EDE6D8]/15 transition-colors">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Wordmark with circular pin/dot icon */}
        <div className="flex items-center gap-2.5">
          <div className="relative flex items-center justify-center">
            {/* Small circular pin/dot icon beside it */}
            <span className="w-3.5 h-3.5 rounded-full bg-[#A83A2D] ring-2 ring-[#A83A2D]/30 inline-block shadow-sm" />
          </div>
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="text-xl sm:text-2xl font-bold font-heading tracking-tight text-[#221F1A] dark:text-[#EDE6D8] hover:opacity-90"
          >
            SponsrMitra
          </a>
        </div>

        {/* Desktop Nav Links */}
        <nav className="hidden md:flex items-center gap-8 font-heading text-sm font-medium text-[#4A4436] dark:text-[#B8B0A0]">
          <button
            onClick={() => handleNavClick('problem')}
            className="hover:text-[#221F1A] dark:hover:text-[#EDE6D8] transition-colors cursor-pointer"
          >
            Problem
          </button>
          <button
            onClick={() => handleNavClick('how-it-works')}
            className="hover:text-[#221F1A] dark:hover:text-[#EDE6D8] transition-colors cursor-pointer"
          >
            How it works
          </button>
          <button
            onClick={() => handleNavClick('who-its-for')}
            className="hover:text-[#221F1A] dark:hover:text-[#EDE6D8] transition-colors cursor-pointer"
          >
            Who it&apos;s for
          </button>
          <button
            onClick={() => handleNavClick('waitlist')}
            className="hover:text-[#221F1A] dark:hover:text-[#EDE6D8] transition-colors cursor-pointer"
          >
            Waitlist
          </button>
        </nav>

        {/* Action Controls */}
        <div className="flex items-center gap-3">
          {/* Sheets Live Badge if connected */}
          {sheetInfo.id && (
            <a
              href={sheetInfo.url || `https://docs.google.com/spreadsheets/d/${sheetInfo.id}/edit`}
              target="_blank"
              rel="noopener noreferrer"
              title="Open Connected Google Sheet"
              className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 text-xs font-heading font-medium bg-[#1F5C56]/10 dark:bg-[#2D7D75]/20 text-[#1F5C56] dark:text-[#37958C] border border-[#1F5C56]/30 dark:border-[#2D7D75]/40 hover:bg-[#1F5C56]/20 transition-colors"
            >
              <Table className="w-3.5 h-3.5" />
              <span>Google Sheet Connected</span>
            </a>
          )}

          {/* Theme Toggle Button */}
          <button
            onClick={onToggleDarkMode}
            aria-label="Toggle dark mode"
            className="p-2 text-[#4A4436] dark:text-[#B8B0A0] hover:text-[#221F1A] dark:hover:text-[#EDE6D8] border border-[#221F1A]/20 dark:border-[#EDE6D8]/20 bg-[#FBF6EA] dark:bg-[#272420] transition-colors cursor-pointer"
            title={darkMode ? 'Switch to daylight noticeboard' : 'Switch to evening noticeboard'}
          >
            {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          {/* Join Waitlist Button - No arrow icon */}
          <button
            onClick={() => onScrollToWaitlist()}
            className="font-heading font-semibold text-sm px-4 py-2 bg-[#D9761C] hover:bg-[#BF6513] text-[#FBF6EA] border border-[#221F1A]/25 dark:border-[#EDE6D8]/20 shadow-sm transition-all duration-150 cursor-pointer active:translate-y-0.5"
          >
            Join waitlist
          </button>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-[#221F1A] dark:text-[#EDE6D8] border border-[#221F1A]/20 dark:border-[#EDE6D8]/20 bg-[#FBF6EA] dark:bg-[#272420]"
            aria-label="Toggle menu"
          >
            <span className="block w-4 h-0.5 bg-current mb-1" />
            <span className="block w-4 h-0.5 bg-current mb-1" />
            <span className="block w-4 h-0.5 bg-current" />
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-[#221F1A]/15 dark:border-[#EDE6D8]/15 bg-[#FBF6EA] dark:bg-[#272420] px-4 py-4 space-y-3 font-heading text-sm">
          <button
            onClick={() => handleNavClick('problem')}
            className="block w-full text-left py-1.5 text-[#4A4436] dark:text-[#B8B0A0] hover:text-[#221F1A] dark:hover:text-[#EDE6D8]"
          >
            Problem
          </button>
          <button
            onClick={() => handleNavClick('how-it-works')}
            className="block w-full text-left py-1.5 text-[#4A4436] dark:text-[#B8B0A0] hover:text-[#221F1A] dark:hover:text-[#EDE6D8]"
          >
            How it works
          </button>
          <button
            onClick={() => handleNavClick('who-its-for')}
            className="block w-full text-left py-1.5 text-[#4A4436] dark:text-[#B8B0A0] hover:text-[#221F1A] dark:hover:text-[#EDE6D8]"
          >
            Who it&apos;s for
          </button>
          <button
            onClick={() => handleNavClick('waitlist')}
            className="block w-full text-left py-1.5 text-[#4A4436] dark:text-[#B8B0A0] hover:text-[#221F1A] dark:hover:text-[#EDE6D8]"
          >
            Waitlist
          </button>
          {sheetInfo.id && (
            <a
              href={sheetInfo.url || `https://docs.google.com/spreadsheets/d/${sheetInfo.id}/edit`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 py-2 text-xs text-[#1F5C56] dark:text-[#37958C] border-t border-dashed border-[#221F1A]/20 pt-3"
            >
              <Table className="w-4 h-4" />
              <span>View Connected Google Sheet</span>
            </a>
          )}
        </div>
      )}
    </header>
  );
};
