import React from 'react';
import { PushPin } from './PushPin';
import { TapeStrip } from './TapeStrip';
import { TicketBadge } from './TicketBadge';

interface HeroProps {
  onSelectRole: (role: 'Organiser' | 'Sponsor') => void;
}

export const Hero: React.FC<HeroProps> = ({ onSelectRole }) => {
  return (
    <section className="relative pt-12 pb-20 px-4 sm:px-6 overflow-hidden">
      <div className="max-w-4xl mx-auto">
        {/* Main Rotated Torn-Paper Hero Notice */}
        <div className="relative rotate-[-1.2deg] transition-transform duration-300 hover:rotate-0 mb-14">
          {/* Top Tape Strips */}
          <div className="absolute -top-4 left-12 z-20">
            <TapeStrip rotation="-rotate-3" width="w-28" variant="cream" />
          </div>
          <div className="absolute -top-4 right-12 z-20">
            <TapeStrip rotation="rotate-2" width="w-28" variant="cream" />
          </div>

          {/* Top Pushpins */}
          <div className="absolute -top-2 left-6 z-20">
            <PushPin color="brick" size="md" />
          </div>
          <div className="absolute -top-2 right-6 z-20">
            <PushPin color="teal" size="md" />
          </div>

          {/* The Torn-Paper Card container */}
          <div className="relative bg-[#FBF6EA] dark:bg-[#272420] border-t border-l border-r border-[#221F1A]/20 dark:border-[#EDE6D8]/20 p-8 sm:p-12 md:p-14 shadow-[0_12px_32px_rgba(34,31,26,0.14)] dark:shadow-[0_12px_32px_rgba(0,0,0,0.55)]">
            {/* Campus Bulletin Stamp / Tag */}
            <div className="inline-flex items-center gap-2 border border-[#A83A2D]/40 dark:border-[#C44B3D]/50 px-3 py-1 mb-6 text-xs font-heading font-medium tracking-wide text-[#A83A2D] dark:text-[#C44B3D] bg-[#A83A2D]/5 dark:bg-[#C44B3D]/10">
              <span className="w-1.5 h-1.5 rounded-full bg-[#A83A2D] dark:bg-[#C44B3D]" />
              <span>COLLEGE FEST SPONSORSHIP NOTICE</span>
            </div>

            {/* Headline */}
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold font-heading text-[#221F1A] dark:text-[#EDE6D8] tracking-tight leading-[1.15] mb-6">
              Stop cold-emailing fifty companies and hoping one writes back.
            </h1>

            {/* Subhead */}
            <p className="text-lg sm:text-xl font-serif text-[#4A4436] dark:text-[#B8B0A0] leading-relaxed mb-9 max-w-3xl">
              SponsrMitra is a verified sponsorship marketplace built for Indian
              college fests — real company contacts, real deal benchmarks, and
              warm intros through your own alumni. Less guessing, more planning
              the actual fest.
            </p>

            {/* Two CTA Buttons - strictly no arrow icons */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
              <button
                onClick={() => onSelectRole('Organiser')}
                className="font-heading font-semibold text-base px-7 py-3.5 bg-[#D9761C] hover:bg-[#BF6513] text-[#FBF6EA] border border-[#221F1A]/25 dark:border-[#EDE6D8]/20 shadow-[2px_3px_0_rgba(34,31,26,0.2)] dark:shadow-[2px_3px_0_rgba(0,0,0,0.5)] active:translate-y-0.5 transition-all text-center cursor-pointer"
              >
                I&apos;m organising a fest
              </button>

              <button
                onClick={() => onSelectRole('Sponsor')}
                className="font-heading font-semibold text-base px-7 py-3.5 bg-[#1F5C56] hover:bg-[#174843] text-[#FBF6EA] border border-[#221F1A]/25 dark:border-[#EDE6D8]/20 shadow-[2px_3px_0_rgba(34,31,26,0.2)] dark:shadow-[2px_3px_0_rgba(0,0,0,0.5)] active:translate-y-0.5 transition-all text-center cursor-pointer"
              >
                I want to sponsor one
              </button>
            </div>
          </div>

          {/* Jagged Torn Paper Bottom Edge */}
          <div
            className="w-full h-4 bg-[#FBF6EA] dark:bg-[#272420] border-b border-[#221F1A]/20 dark:border-[#EDE6D8]/20"
            style={{
              clipPath:
                'polygon(0% 0%, 2% 80%, 4% 10%, 6% 90%, 8% 20%, 10% 85%, 12% 15%, 14% 95%, 16% 25%, 18% 90%, 20% 10%, 22% 80%, 24% 20%, 26% 95%, 28% 15%, 30% 85%, 32% 10%, 34% 90%, 36% 20%, 38% 85%, 40% 15%, 42% 95%, 44% 10%, 46% 85%, 48% 25%, 50% 90%, 52% 15%, 54% 85%, 56% 20%, 58% 95%, 60% 10%, 62% 80%, 64% 25%, 66% 90%, 68% 15%, 70% 85%, 72% 20%, 74% 95%, 76% 10%, 78% 85%, 80% 25%, 82% 90%, 84% 15%, 86% 85%, 88% 20%, 90% 95%, 92% 10%, 94% 80%, 96% 25%, 98% 90%, 100% 0%)',
            }}
          />
        </div>

        {/* Three Ticket-Stub Stat Badges */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
          <TicketBadge
            stat="9 in 10"
            label="outreach emails go unanswered"
            badgeNumber="TICKET #01"
            rotation="rotate-[-1deg]"
          />
          <TicketBadge
            stat="4+ months"
            label="fest teams spend hunting for sponsors"
            badgeNumber="TICKET #02"
            rotation="rotate-[1deg]"
          />
          <TicketBadge
            stat="0"
            label="clear sense of what a fair ask even is"
            badgeNumber="TICKET #03"
            rotation="rotate-[-0.8deg]"
          />
        </div>
      </div>
    </section>
  );
};
