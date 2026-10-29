import React from 'react';
import { PushPin } from './PushPin';
import { TapeStrip } from './TapeStrip';

interface WhoItsForProps {
  onSelectRole: (role: 'Organiser' | 'Sponsor') => void;
}

export const WhoItsFor: React.FC<WhoItsForProps> = ({ onSelectRole }) => {
  return (
    <section id="who-its-for" className="py-20 px-4 sm:px-6 relative">
      <div className="max-w-5xl mx-auto">
        {/* Section Heading */}
        <div className="mb-14 text-center sm:text-left">
          <div className="inline-block mb-3 border-b-2 border-[#1F5C56] dark:border-[#2D7D75] pb-1">
            <span className="font-heading text-xs uppercase tracking-wider font-semibold text-[#1F5C56] dark:text-[#37958C]">
              TWO SIDES OF THE CAMPUS NOTICEBOARD
            </span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold font-heading text-[#221F1A] dark:text-[#EDE6D8] tracking-tight">
            Who it&apos;s for
          </h2>
        </div>

        {/* Two Columns */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
          {/* Column 1: Fest Organisers */}
          <div className="relative rotate-[-0.9deg] hover:rotate-0 transition-transform duration-300">
            {/* Pin and Tape */}
            <div className="absolute -top-3 left-8 z-20">
              <PushPin color="brick" size="md" />
            </div>
            <div className="absolute -top-3 right-8 z-20">
              <TapeStrip width="w-20" rotation="-rotate-3" variant="cream" />
            </div>

            <div className="bg-[#FBF6EA] dark:bg-[#272420] border border-[#221F1A]/20 dark:border-[#EDE6D8]/20 p-8 shadow-[3px_5px_18px_rgba(34,31,26,0.1)] dark:shadow-[3px_5px_18px_rgba(0,0,0,0.5)] flex flex-col justify-between h-full">
              <div>
                <div className="border-b border-dashed border-[#221F1A]/20 dark:border-[#EDE6D8]/20 pb-4 mb-6">
                  <span className="text-xs font-mono text-[#D9761C] uppercase font-bold tracking-wider">
                    FOR STUDENT COUNCILS & COMMITTEES
                  </span>
                  <h3 className="font-heading font-bold text-2xl text-[#221F1A] dark:text-[#EDE6D8] mt-1">
                    Fest organisers
                  </h3>
                </div>

                <ul className="space-y-4 font-serif text-[#4A4436] dark:text-[#B8B0A0] text-base leading-relaxed mb-8">
                  <li className="flex items-start gap-3">
                    <span className="font-heading font-bold text-base text-[#D9761C] select-none">•</span>
                    <span>Save months of dead-end research.</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="font-heading font-bold text-base text-[#D9761C] select-none">•</span>
                    <span>Walk into a pitch already knowing what&apos;s realistic to ask for.</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="font-heading font-bold text-base text-[#D9761C] select-none">•</span>
                    <span>Get introduced by someone who already believes in your fest.</span>
                  </li>
                </ul>
              </div>

              {/* Action Button - strictly no arrow icon */}
              <button
                onClick={() => onSelectRole('Organiser')}
                className="w-full font-heading font-semibold text-base py-3.5 px-6 bg-[#D9761C] hover:bg-[#BF6513] text-[#FBF6EA] border border-[#221F1A]/20 dark:border-[#EDE6D8]/20 shadow-[2px_2px_0_rgba(34,31,26,0.15)] active:translate-y-0.5 transition-all text-center cursor-pointer"
              >
                Join as an organiser
              </button>
            </div>
          </div>

          {/* Column 2: Brands & Sponsors */}
          <div className="relative rotate-[0.9deg] hover:rotate-0 transition-transform duration-300">
            {/* Pin and Tape */}
            <div className="absolute -top-3 left-8 z-20">
              <PushPin color="teal" size="md" />
            </div>
            <div className="absolute -top-3 right-8 z-20">
              <TapeStrip width="w-20" rotation="rotate-2" variant="cream" />
            </div>

            <div className="bg-[#FBF6EA] dark:bg-[#272420] border border-[#221F1A]/20 dark:border-[#EDE6D8]/20 p-8 shadow-[3px_5px_18px_rgba(34,31,26,0.1)] dark:shadow-[3px_5px_18px_rgba(0,0,0,0.5)] flex flex-col justify-between h-full">
              <div>
                <div className="border-b border-dashed border-[#221F1A]/20 dark:border-[#EDE6D8]/20 pb-4 mb-6">
                  <span className="text-xs font-mono text-[#1F5C56] dark:text-[#37958C] uppercase font-bold tracking-wider">
                    FOR MARKETING & YOUTH BRANDS
                  </span>
                  <h3 className="font-heading font-bold text-2xl text-[#221F1A] dark:text-[#EDE6D8] mt-1">
                    Brands &amp; sponsors
                  </h3>
                </div>

                <ul className="space-y-4 font-serif text-[#4A4436] dark:text-[#B8B0A0] text-base leading-relaxed mb-8">
                  <li className="flex items-start gap-3">
                    <span className="font-heading font-bold text-base text-[#1F5C56] dark:text-[#37958C] select-none">•</span>
                    <span>Discover pre-qualified, verified college fests.</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="font-heading font-bold text-base text-[#1F5C56] dark:text-[#37958C] select-none">•</span>
                    <span>Skip the pile of unsolicited decks.</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="font-heading font-bold text-base text-[#1F5C56] dark:text-[#37958C] select-none">•</span>
                    <span>Reach college audiences without chasing every campus yourself.</span>
                  </li>
                </ul>
              </div>

              {/* Action Button - strictly no arrow icon */}
              <button
                onClick={() => onSelectRole('Sponsor')}
                className="w-full font-heading font-semibold text-base py-3.5 px-6 bg-[#1F5C56] hover:bg-[#174843] text-[#FBF6EA] border border-[#221F1A]/20 dark:border-[#EDE6D8]/20 shadow-[2px_2px_0_rgba(34,31,26,0.15)] active:translate-y-0.5 transition-all text-center cursor-pointer"
              >
                Join as a sponsor
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
