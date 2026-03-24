import React from 'react';
import { motion } from 'framer-motion';
import { useInView } from 'react-intersection-observer';

const problems = [
  {
    icon: '🐛',
    title: 'Reactive diagnostics arrive too late',
    description:
      'Many farms detect disease only after visible spread. Delayed response increases treatment cost and reduces harvest quality.',
    stat: '40-50%',
    statText: 'harvest loss from preventable risks',
  },
  {
    icon: '🌡️',
    title: 'Drought stress is often invisible',
    description:
      'Without continuous vegetation tracking, farmers miss early warning signals and irrigation decisions happen after severe decline.',
    stat: 'High',
    statText: 'risk exposure in rain-dependent regions',
  },
  {
    icon: '🧾',
    title: 'Insurance claims are trust-heavy and slow',
    description:
      'Manual workflows and fragmented evidence delay payouts when farmers need support the most during extreme weather seasons.',
    stat: 'Weeks',
    statText: 'typical delay in traditional claim cycles',
  },
  {
    icon: '🔒',
    title: 'Critical farm decisions lack audit trails',
    description:
      'Predictions, recommendations, and payouts are rarely linked in a transparent timeline that stakeholders can independently verify.',
    stat: 'Low',
    statText: 'traceability across decision systems',
  },
];

const ProblemSection: React.FC = () => {
  const [ref, inView] = useInView({ triggerOnce: true, threshold: 0.1 });

  return (
    <section id="problem" className="relative overflow-hidden bg-[#0a0f0a] py-24">
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            'linear-gradient(#ef4444 1px, transparent 1px), linear-gradient(90deg, #ef4444 1px, transparent 1px)',
          backgroundSize: '68px 68px',
        }}
      />

      <div className="relative z-10 mx-auto max-w-7xl px-6 lg:px-8">
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 40 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7 }}
          className="mb-16"
        >
          <p className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-rose-400">The Challenge</p>
          <h2 className="max-w-3xl text-4xl font-bold leading-tight text-white sm:text-5xl" style={{ fontFamily: 'Syne, sans-serif' }}>
            Farmers face compounding risks without coordinated intelligence.
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {problems.map((problem, index) => (
            <motion.div
              key={problem.title}
              initial={{ opacity: 0, y: 34 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: index * 0.12 }}
              className="rounded-2xl border border-white/10 bg-white/[0.03] p-8 transition-colors duration-300 hover:bg-white/[0.06] hover:border-white/20"
            >
              <div className="flex items-start gap-5">
                <div className="mt-1 text-3xl">{problem.icon}</div>
                <div>
                  <h3 className="mb-2 text-lg font-bold text-white" style={{ fontFamily: 'Syne, sans-serif' }}>
                    {problem.title}
                  </h3>
                  <p className="mb-4 text-sm leading-relaxed text-gray-400">{problem.description}</p>
                  <div className="flex items-center gap-3">
                    <span className="text-2xl font-bold text-rose-400" style={{ fontFamily: 'Syne, sans-serif' }}>
                      {problem.stat}
                    </span>
                    <span className="text-xs text-gray-500">{problem.statText}</span>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 28 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.55 }}
          className="mt-12 rounded-2xl border border-red-900/40 bg-gradient-to-r from-red-950/40 to-orange-950/30 p-8 text-center"
        >
          <p className="mb-2 text-lg font-semibold text-white">The data exists. Coordination is the missing layer.</p>
          <p className="text-sm text-gray-300">
            AgriSense AI closes the loop by coordinating specialized agents and writing every material decision to Hedera for traceable trust.
          </p>
        </motion.div>
      </div>
    </section>
  );
};

export default ProblemSection;