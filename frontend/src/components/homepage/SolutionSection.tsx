import React from 'react';
import { motion } from 'framer-motion';
import { useInView } from 'react-intersection-observer';

const solutions = [
  {
    layer: '01',
    icon: '🛰️',
    title: 'CropWatchAgent',
    sub: 'Satellite Monitoring Agent',
    description:
      'Continuously interprets NDVI and NDWI from NASA HLS imagery to classify vegetation health and drought pressure for farm boundaries.',
    features: ['NASA HLS integration', 'Vegetation index analysis', 'Drought classification', 'HCS decision logging'],
    accentBg: 'bg-cyan-900/20',
    accentText: 'text-cyan-300',
    accentBorder: 'border-cyan-800/40',
  },
  {
    layer: '02',
    icon: '🧠',
    title: 'AdvisoryAgent',
    sub: 'Contextual Intelligence Agent',
    description:
      'Combines disease detections with farm-level risk context to generate practical treatment and prevention guidance through Gemini.',
    features: ['Disease-aware advice', 'Context injection from satellite signals', 'Actionable treatment plans', 'Advisory topic proofs'],
    accentBg: 'bg-emerald-900/20',
    accentText: 'text-emerald-300',
    accentBorder: 'border-emerald-800/40',
  },
  {
    layer: '03',
    icon: '🛡️',
    title: 'InsuranceOracleAgent',
    sub: 'Autonomous Claims Agent',
    description:
      'Runs scheduled risk checks and executes smart contract insurance logic when threshold conditions indicate severe agricultural stress.',
    features: ['Scheduled autonomous checks', 'On-chain claim execution', 'Eligibility and payout checks', 'Insurance HCS audit trail'],
    accentBg: 'bg-amber-900/20',
    accentText: 'text-amber-300',
    accentBorder: 'border-amber-800/40',
  },
  {
    layer: '04',
    icon: '🪙',
    title: 'DataMarketplaceAgent',
    sub: 'Rewards and Provenance Agent',
    description:
      'Distributes ASAI token incentives and mints NFT evidence so every meaningful data contribution becomes a verifiable digital asset.',
    features: ['ASAI reward distribution', 'NFT proof minting', 'HTS transfer flow', 'Marketplace topic ledgering'],
    accentBg: 'bg-fuchsia-900/20',
    accentText: 'text-fuchsia-300',
    accentBorder: 'border-fuchsia-800/40',
  },
];

const SolutionSection: React.FC = () => {
  const [ref, inView] = useInView({ triggerOnce: true, threshold: 0.08 });

  return (
    <section id="solution" className="relative overflow-hidden bg-[#05100c] py-24">
      <div className="pointer-events-none absolute left-1/2 top-0 h-[420px] w-[820px] -translate-x-1/2 rounded-full bg-emerald-900/20 blur-3xl" />

      <div className="relative z-10 mx-auto max-w-7xl px-6 lg:px-8">
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 40 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7 }}
          className="mb-16 text-center"
        >
          <p className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-emerald-400">The Solution</p>
          <h2
            className="mx-auto max-w-3xl text-4xl font-bold leading-tight text-white sm:text-5xl"
            style={{ fontFamily: 'Syne, sans-serif' }}
          >
            A coordinated multi-agent architecture for resilient farming.
          </h2>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-gray-400">
            Each agent has a clear role, dedicated Hedera topic, and measurable impact in the full farm decision pipeline.
          </p>
        </motion.div>

        <div className="space-y-6">
          {solutions.map((solution, index) => (
            <motion.div
              key={solution.title}
              initial={{ opacity: 0, x: index % 2 === 0 ? -34 : 34 }}
              animate={inView ? { opacity: 1, x: 0 } : {}}
              transition={{ duration: 0.65, delay: index * 0.15 }}
              className={`relative overflow-hidden rounded-2xl border ${solution.accentBorder} bg-white/[0.03] p-8 transition-colors duration-300 hover:bg-white/[0.05]`}
            >
              <div className="absolute right-8 top-8 select-none text-7xl font-bold text-white/[0.03]" style={{ fontFamily: 'Syne, sans-serif' }}>
                {solution.layer}
              </div>

              <div className="relative z-10 grid grid-cols-1 gap-8 lg:grid-cols-2 lg:items-center">
                <div>
                  <div className="mb-4 flex items-center gap-4">
                    <div className={`flex h-12 w-12 items-center justify-center rounded-xl text-2xl ${solution.accentBg}`}>
                      {solution.icon}
                    </div>
                    <div>
                      <div className="text-xs uppercase tracking-[0.2em] text-gray-500">{solution.sub}</div>
                      <h3 className="text-xl font-bold text-white" style={{ fontFamily: 'Syne, sans-serif' }}>
                        {solution.title}
                      </h3>
                    </div>
                  </div>
                  <p className="text-sm leading-relaxed text-gray-400">{solution.description}</p>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {solution.features.map((feature) => (
                    <div key={feature} className="flex items-center gap-2 text-sm text-gray-300">
                      <i className={`fas fa-check-circle text-xs ${solution.accentText}`} />
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, delay: 0.7 }}
          className="mt-12 rounded-2xl border border-emerald-900/40 bg-gradient-to-r from-emerald-950/60 to-cyan-950/40 p-8"
        >
          <div className="flex flex-col items-start justify-between gap-5 md:flex-row md:items-center">
            <div>
              <div className="mb-2 flex items-center gap-2 text-emerald-300">
                <i className="fas fa-network-wired" />
                <span className="text-sm font-semibold">Orchestrated intelligence loop</span>
              </div>
              <p className="max-w-3xl text-sm text-gray-300">
                The orchestrator coordinates specialist agents, then the hashgraph layer records decisions and executes value flows for rewards and insurance outcomes.
              </p>
            </div>
            <div className="rounded-xl border border-white/10 bg-black/30 px-4 py-2 text-xs text-gray-300">
              Python Agents {'->'} Hedera HCS/HTS/HSCS
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default SolutionSection;