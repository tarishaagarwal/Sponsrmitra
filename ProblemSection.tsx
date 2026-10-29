import React from 'react';
import { PushPin } from './PushPin';
import { TapeStrip } from './TapeStrip';

export const ProblemSection: React.FC = () => {
  return (
    <section id="problem" className="py-20 px-4 sm:px-6 relative">
      <div className="max-w-5xl mx-auto">
        {/* Section Heading */}
        <div className="mb-14 text-center sm:text-left">
          <div className="inline-block mb-3 border-b-2 border-[#A83A2D] dark:border-[#C44B3D] pb-1">
            <span className="font-heading text-xs uppercase tracking-wider font-semibold text-[#A83A2D] dark:text-[#C44B3D]">
              THE CYCLE OF WASTED EFFORT
            </span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold font-heading text-[#221F1A] dark:text-[#EDE6D8] tracking-tight max-w-2xl">
            Every fest team reinvents this wheel, badly, once a year.
          </h2>
        </div>

        {/* Side-by-side Note Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
          {/* Note Card 1: The old way */}
          <div className="relative rotate-[-1.2deg] hover:rotate-0 transition-transform duration-300">
            {/* Top pushpin and tape */}
            <div className="absolute -top-3 left-8 z-20">
              <PushPin color="brick" size="md" />
            </div>
            <div className="absolute -top-3 right-8 z-20">
              <TapeStrip width="w-20" rotation="rotate-3" variant="brick" />
            </div>

            <div className="bg-[#FBF6EA] dark:bg-[#272420] border border-[#221F1A]/20 dark:border-[#EDE6D8]/20 p-8 shadow-[3px_4px_16px_rgba(34,31,26,0.1)] dark:shadow-[3px_4px_16px_rgba(0,0,0,0.5)]">
              {/* Card Header */}
              <div className="flex items-center justify-between border-b border-dashed border-[#221F1A]/20 dark:border-[#EDE6D8]/20 pb-3 mb-6">
                <h3 className="font-heading font-bold text-xl text-[#A83A2D] dark:text-[#C44B3D]">
                  The old way
                </h3>
                <span className="text-xs font-mono text-[#4A4436]/60 dark:text-[#B8B0A0]/60">
                  CHAOS & PRAYERS
                </span>
              </div>

              {/* List of painful steps */}
              <ul className="space-y-4 font-serif text-[#4A4436] dark:text-[#B8B0A0] text-base leading-relaxed">
                <li className="flex items-start gap-3">
                  <span className="font-heading font-bold text-sm text-[#A83A2D] mt-0.5 select-none">—</span>
                  <span>Scrape LinkedIn for a name and guess at an email address.</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="font-heading font-bold text-sm text-[#A83A2D] mt-0.5 select-none">—</span>
                  <span>Send fifty identical pitches into the void.</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="font-heading font-bold text-sm text-[#A83A2D] mt-0.5 select-none">—</span>
                  <span>Wait, follow up, wait again.</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="font-heading font-bold text-sm text-[#A83A2D] mt-0.5 select-none">—</span>
                  <span>
                    Find out three weeks out the &quot;confirmed&quot; sponsor never signed anything.
                  </span>
                </li>
              </ul>
            </div>
          </div>

          {/* Note Card 2: With SponsrMitra */}
          <div className="relative rotate-[1.2deg] hover:rotate-0 transition-transform duration-300">
            {/* Top pushpin and tape */}
            <div className="absolute -top-3 left-8 z-20">
              <PushPin color="teal" size="md" />
            </div>
            <div className="absolute -top-3 right-8 z-20">
              <TapeStrip width="w-20" rotation="-rotate-2" variant="cream" />
            </div>

            <div className="bg-[#FBF6EA] dark:bg-[#272420] border-2 border-[#1F5C56]/40 dark:border-[#2D7D75]/50 p-8 shadow-[3px_4px_16px_rgba(34,31,26,0.1)] dark:shadow-[3px_4px_16px_rgba(0,0,0,0.5)]">
              {/* Card Header */}
              <div className="flex items-center justify-between border-b border-dashed border-[#1F5C56]/30 dark:border-[#2D7D75]/40 pb-3 mb-6">
                <h3 className="font-heading font-bold text-xl text-[#1F5C56] dark:text-[#37958C]">
                  With SponsrMitra
                </h3>
                <span className="text-xs font-mono text-[#1F5C56]/70 dark:text-[#37958C]/70">
                  SYSTEMATIC & VERIFIED
                </span>
              </div>

              {/* List of modern steps */}
              <ul className="space-y-4 font-serif text-[#221F1A] dark:text-[#EDE6D8] text-base leading-relaxed">
                <li className="flex items-start gap-3">
                  <span className="font-heading font-bold text-sm text-[#1F5C56] dark:text-[#37958C] mt-0.5 select-none">✓</span>
                  <span>
                    Search companies that have already confirmed they sponsor college fests.
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="font-heading font-bold text-sm text-[#1F5C56] dark:text-[#37958C] mt-0.5 select-none">✓</span>
                  <span>
                    See what fests your size actually got, by category and sponsor type.
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="font-heading font-bold text-sm text-[#1F5C56] dark:text-[#37958C] mt-0.5 select-none">✓</span>
                  <span>
                    Ask your own college&apos;s alumni for a warm introduction.
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="font-heading font-bold text-sm text-[#1F5C56] dark:text-[#37958C] mt-0.5 select-none">✓</span>
                  <span>
                    Know exactly where every conversation stands.
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
