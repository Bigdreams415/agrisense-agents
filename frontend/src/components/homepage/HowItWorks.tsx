import React from 'react';
import { motion } from 'framer-motion';
import { useInView } from 'react-intersection-observer';

const steps = [
  {
    number: '01',
    icon: 'fa-seedling',
    title: 'Capture Farm Inputs',
    description:
      'Farmers submit a leaf image, map boundaries, and crop context once. The orchestrator then activates the required agent workflow.',
    detail: 'Image + Boundary + Crop Context',
    color: 'emerald',
  },
  {
    number: '02',
    icon: 'fa-robot',
    title: 'Agents Coordinate Intelligence',
    description:
      'CropWatchAgent analyzes satellite vegetation, AdvisoryAgent generates contextual guidance, and InsuranceOracleAgent evaluates risk conditions autonomously.',
    detail: 'CropWatch + Advisory + Oracle',
    color: 'cyan',
  },
  {
    number: '03',
    icon: 'fa-link',
    title: 'Actions Recorded On Hedera',
    description:
      'Decisions are logged to dedicated HCS topics, rewards can be distributed via HTS, and insurance claims can execute through HSCS smart contracts.',
    detail: 'HCS + HTS + HSCS',
    color: 'amber',
  },
];

const HowItWorks: React.FC = () => {
  const [ref, inView] = useInView({ triggerOnce: true, threshold: 0.1 });

  return (
    <section id="how-it-works" className="relative overflow-hidden bg-[#07110a] py-24">
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            'linear-gradient(#22c55e 1px, transparent 1px), linear-gradient(90deg, #22c55e 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }}
      />

      <div className="relative z-10 mx-auto max-w-7xl px-6 lg:px-8">
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 40 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7 }}
          className="mb-16 text-center"
        >
          <p className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-emerald-400">How It Works</p>
          <h2
            className="mx-auto max-w-3xl text-4xl font-bold leading-tight text-white sm:text-5xl"
            style={{ fontFamily: 'Syne, sans-serif' }}
          >
            One request starts a full autonomous farm intelligence cycle.
          </h2>
        </motion.div>

        <div className="relative">
          <div className="absolute left-0 right-0 top-16 hidden h-px bg-gradient-to-r from-transparent via-white/15 to-transparent lg:block" />

          <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
            {steps.map((step, index) => (
              <motion.div
                key={step.number}
                initial={{ opacity: 0, y: 45 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.65, delay: index * 0.18 }}
                className="relative"
              >
                <div className="mb-7 flex items-center justify-center">
                  <div
                    className={`flex h-16 w-16 items-center justify-center rounded-2xl border ${
                      step.color === 'emerald'
                        ? 'border-emerald-700/50 bg-emerald-900/35 text-emerald-300'
                        : step.color === 'cyan'
                        ? 'border-cyan-700/50 bg-cyan-900/35 text-cyan-300'
                        : 'border-amber-700/50 bg-amber-900/35 text-amber-300'
                    }`}
                  >
                    <i className={`fas ${step.icon} text-xl`} />
                  </div>
                  <span
                    className="absolute -right-2 -top-1 bg-[#07110a] px-1 text-xs font-bold text-gray-500"
                    style={{ fontFamily: 'Syne, sans-serif' }}
                  >
                    {step.number}
                  </span>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 transition-colors duration-300 hover:border-white/20">
                  <h3 className="mb-3 text-xl font-bold text-white" style={{ fontFamily: 'Syne, sans-serif' }}>
                    {step.title}
                  </h3>
                  <p className="mb-4 text-sm leading-relaxed text-gray-400">{step.description}</p>
                  <div
                    className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs ${
                      step.color === 'emerald'
                        ? 'border-emerald-800/40 bg-emerald-900/30 text-emerald-300'
                        : step.color === 'cyan'
                        ? 'border-cyan-800/40 bg-cyan-900/30 text-cyan-300'
                        : 'border-amber-800/40 bg-amber-900/30 text-amber-300'
                    }`}
                  >
                    <i className="fas fa-microchip text-xs" />
                    <span>{step.detail}</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 28 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, delay: 0.65 }}
          className="mt-14 grid grid-cols-1 gap-6 md:grid-cols-2"
        >
          <div className="rounded-2xl border border-emerald-900/40 bg-emerald-950/25 p-6">
            <div className="mb-3 flex items-center gap-2 text-emerald-300">
              <i className="fas fa-scroll" />
              <span className="text-sm font-semibold">Auditable by design</span>
            </div>
            <p className="text-sm leading-relaxed text-gray-300">
              Every agent output is written to dedicated Hedera topics so farmers, partners, and insurers can verify what happened and when.
            </p>
          </div>

          <div className="rounded-2xl border border-cyan-900/40 bg-cyan-950/25 p-6">
            <div className="mb-3 flex items-center gap-2 text-cyan-300">
              <i className="fas fa-bolt" />
              <span className="text-sm font-semibold">Autonomous execution</span>
            </div>
            <p className="text-sm leading-relaxed text-gray-300">
              Insurance checks run on schedule without manual approval bottlenecks, while advisory and reward actions remain traceable across the full workflow.
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default HowItWorks;