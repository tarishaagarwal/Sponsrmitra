import React from 'react';
import { PushPin } from './PushPin';
import { TapeStrip } from './TapeStrip';

export const HowItWorks: React.FC = () => {
  const steps = [
    {
      num: '01',
      title: 'Verified contacts',
      desc: "Every company has confirmed it's open to sponsoring fests, and every contact has been checked — no scraped names, no dead inboxes.",
      pin: 'brick' as const,
      rotation: 'rotate-[-1deg]',
      tag: 'NO DEAD ENDS',
    },
    {
      num: '02',
      title: 'Benchmark data',
      desc: 'See what fests your size actually raised, by category and sponsor type, so you stop guessing whether to ask for ₹20,000 or ₹2,00,000.',
      pin: 'teal' as const,
      rotation: 'rotate-[1.2deg]',
      tag: 'REAL DEALS',
    },
    {
      num: '03',
      title: 'Alumni intros',
      desc: "Request a warm introduction through your own college's alumni working at the company — warm asks get answered far more than cold ones.",
      pin: 'marigold' as const,
      rotation: 'rotate-[-0.8deg]',
      tag: 'WARM DOORS',
    },
  ];

  return (
    <section id="how-it-works" className="py-20 px-4 sm:px-6 relative">
      <div className="max-w-5xl mx-auto">
        {/* Section Heading */}
        <div className="mb-14 text-center sm:text-left">
          <div className="inline-block mb-3 border-b-2 border-[#D9761C] pb-1">
            <span className="font-heading text-xs uppercase tracking-wider font-semibold text-[#D9761C]">
              BEYOND DIRECTORY SCRAPING
            </span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold font-heading text-[#221F1A] dark:text-[#EDE6D8] tracking-tight max-w-2xl">
            Three things a listings site doesn&apos;t give you.
          </h2>
        </div>

        {/* 3 Step Index Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {steps.map((step, idx) => (
            <div
              key={idx}
              className={`relative ${step.rotation} hover:rotate-0 transition-transform duration-300`}
            >
              {/* Pushpin at top center/left */}
              <div className="absolute -top-3 left-6 z-20">
                <PushPin color={step.pin} size="md" />
              </div>
              <div className="absolute -top-3 right-6 z-20">
                <TapeStrip width="w-16" rotation="rotate-2" variant="cream" />
              </div>

              {/* Card Container */}
              <div className="h-full bg-[#FBF6EA] dark:bg-[#272420] border border-[#221F1A]/20 dark:border-[#EDE6D8]/20 p-7 flex flex-col justify-between shadow-[2px_4px_14px_rgba(34,31,26,0.08)] dark:shadow-[2px_4px_14px_rgba(0,0,0,0.45)]">
                <div>
                  {/* Step Header */}
                  <div className="flex items-baseline justify-between border-b border-dashed border-[#221F1A]/15 dark:border-[#EDE6D8]/15 pb-3 mb-5">
                    <span className="font-heading font-bold text-2xl text-[#D9761C]">
                      Step {step.num}
                    </span>
                    <span className="text-[10px] font-mono tracking-widest text-[#4A4436]/60 dark:text-[#B8B0A0]/60">
                      {step.tag}
                    </span>
                  </div>

                  {/* Title */}
                  <h3 className="text-xl font-bold font-heading text-[#221F1A] dark:text-[#EDE6D8] mb-3">
                    {step.title}
                  </h3>

                  {/* Description */}
                  <p className="font-serif text-[#4A4436] dark:text-[#B8B0A0] text-base leading-relaxed">
                    {step.desc}
                  </p>
                </div>

                {/* Subtle index card footer detail */}
                <div className="mt-6 pt-3 border-t border-[#221F1A]/10 dark:border-[#EDE6D8]/10 flex items-center justify-between text-xs font-mono text-[#4A4436]/50 dark:text-[#B8B0A0]/50">
                  <span>SPONSOR-MITRA</span>
                  <span>INDEX {step.num}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
