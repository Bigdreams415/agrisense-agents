import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useInView } from 'react-intersection-observer';

type Tab = 'advisory' | 'satellite' | 'oracle';

const DEMOS: Record<
  Tab,
  {
    title: string;
    icon: string;
    label: string;
    description: string;
    result: { label: string; value: string; accent: string }[];
    insight: string;
    proof: string;
    badge: string;
  }
> = {
  advisory: {
    title: 'Advisory Agent Output',
    icon: '🧠',
    label: 'Disease + Context + Guidance',
    description:
      'Leaf scan and farm context are fused so AdvisoryAgent can return practical guidance tailored to disease type, vegetation status, and risk.',
    result: [
      { label: 'Detected Disease', value: 'Tomato Late Blight', accent: 'text-red-400' },
      { label: 'Confidence', value: '94.2%', accent: 'text-amber-300' },
      { label: 'Vegetation Context', value: 'Declining', accent: 'text-orange-300' },
      { label: 'Advice Source', value: 'Gemini + Farm Signals', accent: 'text-emerald-300' },
    ],
    insight:
      'Spray copper fungicide within 24 hours, isolate affected leaves, and prioritize western rows where stress is highest.',
    proof: 'HCS Topic: AdvisoryAgent',
    badge: 'AdvisoryAgent · Gemini 2.0 Flash',
  },
  satellite: {
    title: 'CropWatch Agent Output',
    icon: '🛰️',
    label: 'Boundary-Based Satellite Intelligence',
    description:
      'Farm boundary coordinates are analyzed against NASA HLS imagery to compute NDVI/NDWI and classify vegetation and drought pressure.',
    result: [
      { label: 'NDVI Mean', value: '0.099', accent: 'text-red-400' },
      { label: 'NDWI Mean', value: '-0.122', accent: 'text-orange-300' },
      { label: 'Vegetation Health', value: 'Poor', accent: 'text-red-300' },
      { label: 'Drought Risk', value: 'Severe', accent: 'text-red-400' },
    ],
    insight:
      'Immediate irrigation is recommended. Prioritize low-retention zones and reassess NDVI after 48 hours for recovery tracking.',
    proof: 'HCS Topic: CropWatchAgent',
    badge: 'CropWatchAgent · NASA HLS',
  },
  oracle: {
    title: 'Insurance Oracle Decision',
    icon: '🛡️',
    label: 'Autonomous Claim Evaluation',
    description:
      'InsuranceOracleAgent checks thresholds on schedule and, when conditions are met, triggers smart contract claim execution without manual approval.',
    result: [
      { label: 'Condition 1', value: 'NDVI < 20% ✓', accent: 'text-emerald-300' },
      { label: 'Condition 2', value: 'Vegetation = Poor ✓', accent: 'text-emerald-300' },
      { label: 'Condition 3', value: 'Drought = High ✓', accent: 'text-emerald-300' },
      { label: 'Oracle Action', value: 'Claim Triggered', accent: 'text-cyan-300' },
    ],
    insight:
      'Policy eligibility and contract balance checks passed. Payout transaction submitted and claim state updated for the season.',
    proof: 'HCS Topic: InsuranceOracleAgent',
    badge: 'InsuranceOracleAgent · HSCS',
  },
};

const LiveDemo: React.FC = () => {
  const [ref, inView] = useInView({ triggerOnce: true, threshold: 0.1 });
  const [activeTab, setActiveTab] = useState<Tab>('advisory');
  const demo = DEMOS[activeTab];

  return (
    <section id="live-demo" className="relative overflow-hidden bg-[#04110b] py-24">
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-[420px] w-[720px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-900/20 blur-3xl" />

      <div className="relative z-10 mx-auto max-w-7xl px-6 lg:px-8">
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 40 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7 }}
          className="mb-16 text-center"
        >
          <p className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-emerald-400">Live Intelligence</p>
          <h2
            className="mx-auto max-w-3xl text-4xl font-bold leading-tight text-white sm:text-5xl"
            style={{ fontFamily: 'Syne, sans-serif' }}
          >
            Real agent outputs from one autonomous workflow.
          </h2>
          <p className="mx-auto mt-4 max-w-3xl text-lg text-gray-400">
            Explore how advisory, satellite, and oracle decisions are produced and then verified through Hedera-backed traces.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mb-10 flex justify-center"
        >
          <div className="inline-flex gap-1 rounded-xl border border-white/10 bg-white/[0.04] p-1">
            {(Object.keys(DEMOS) as Tab[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`rounded-lg px-5 py-2.5 text-sm font-medium transition-all duration-200 ${
                  activeTab === tab ? 'bg-emerald-600 text-white' : 'text-gray-400 hover:text-white'
                }`}
              >
                {DEMOS[tab].icon} {DEMOS[tab].title.split(' ')[0]} {DEMOS[tab].title.split(' ')[1]}
              </button>
            ))}
          </div>
        </motion.div>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.35 }}
            className="grid grid-cols-1 gap-8 lg:grid-cols-2"
          >
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-8">
              <div className="mb-5 flex items-center gap-3">
                <div className="text-3xl">{demo.icon}</div>
                <div>
                  <div className="text-xs uppercase tracking-[0.2em] text-gray-500">{demo.label}</div>
                  <h3 className="text-xl font-bold text-white" style={{ fontFamily: 'Syne, sans-serif' }}>
                    {demo.title}
                  </h3>
                </div>
              </div>

              <p className="mb-6 text-sm leading-relaxed text-gray-400">{demo.description}</p>

              <div className="mb-6 grid grid-cols-2 gap-3">
                {demo.result.map((item) => (
                  <div key={item.label} className="rounded-xl bg-black/30 p-3">
                    <div className="mb-1 text-xs text-gray-500">{item.label}</div>
                    <div className={`text-sm font-semibold ${item.accent}`}>{item.value}</div>
                  </div>
                ))}
              </div>

              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-800/40 bg-emerald-900/30 px-3 py-1.5 text-xs text-emerald-300">
                <i className="fas fa-microchip text-xs" />
                <span>{demo.badge}</span>
              </div>
            </div>

            <div className="flex flex-col rounded-2xl border border-white/10 bg-white/[0.04] p-8">
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-900/50">
                  <i className="fas fa-robot text-sm text-emerald-300" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-white">Agent Insight</div>
                  <div className="text-xs text-gray-500">Generated from live workflow signals</div>
                </div>
              </div>

              <div className="flex-1 rounded-xl border border-white/5 bg-black/35 p-5">
                <p className="text-sm leading-relaxed text-gray-200">{demo.insight}</p>
              </div>

              <div className="mt-6 rounded-xl border border-cyan-900/40 bg-cyan-950/25 p-4">
                <div className="mb-1 text-xs uppercase tracking-wider text-cyan-300">Verification</div>
                <p className="text-sm text-gray-300">{demo.proof}</p>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
};

export default LiveDemo;