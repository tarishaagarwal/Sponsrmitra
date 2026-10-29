/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { Hero } from './components/Hero';
import { ProblemSection } from './components/ProblemSection';
import { HowItWorks } from './components/HowItWorks';
import { WhoItsFor } from './components/WhoItsFor';
import { WaitlistSection } from './components/WaitlistSection';
import { Footer } from './components/Footer';

export default function App() {
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('sponsrmitra_theme');
      return saved === 'dark';
    }
    return false;
  });

  const [selectedRole, setSelectedRole] = useState<'Organiser' | 'Sponsor'>('Organiser');

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('sponsrmitra_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('sponsrmitra_theme', 'light');
    }
  }, [darkMode]);

  const toggleDarkMode = () => {
    setDarkMode((prev) => !prev);
  };

  const handleScrollToWaitlist = (role?: 'Organiser' | 'Sponsor') => {
    if (role) {
      setSelectedRole(role);
    }
    const waitlistElement = document.getElementById('waitlist');
    if (waitlistElement) {
      waitlistElement.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen campus-noticeboard-bg text-[#221F1A] dark:text-[#EDE6D8] transition-colors duration-200 selection:bg-[#D9761C]/30 selection:text-[#221F1A]">
      {/* Sticky Navigation */}
      <Navbar
        darkMode={darkMode}
        onToggleDarkMode={toggleDarkMode}
        onScrollToWaitlist={handleScrollToWaitlist}
      />

      {/* Main Noticeboard Content */}
      <main>
        {/* 1. Hero Section */}
        <Hero onSelectRole={handleScrollToWaitlist} />

        {/* Noticeboard divider string / wire */}
        <div className="max-w-5xl mx-auto px-6">
          <div className="border-b border-[#221F1A]/10 dark:border-[#EDE6D8]/10 border-dashed" />
        </div>

        {/* 2. Problem Section */}
        <ProblemSection />

        {/* Noticeboard divider string / wire */}
        <div className="max-w-5xl mx-auto px-6">
          <div className="border-b border-[#221F1A]/10 dark:border-[#EDE6D8]/10 border-dashed" />
        </div>

        {/* 3. How It Works Section */}
        <HowItWorks />

        {/* Noticeboard divider string / wire */}
        <div className="max-w-5xl mx-auto px-6">
          <div className="border-b border-[#221F1A]/10 dark:border-[#EDE6D8]/10 border-dashed" />
        </div>

        {/* 4. Who It's For Section */}
        <WhoItsFor onSelectRole={handleScrollToWaitlist} />

        {/* Noticeboard divider string / wire */}
        <div className="max-w-5xl mx-auto px-6">
          <div className="border-b border-[#221F1A]/10 dark:border-[#EDE6D8]/10 border-dashed" />
        </div>

        {/* 5. Waitlist Form Section with Working Google Sheet Integration */}
        <WaitlistSection
          selectedRole={selectedRole}
          onChangeRole={setSelectedRole}
        />
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
}
