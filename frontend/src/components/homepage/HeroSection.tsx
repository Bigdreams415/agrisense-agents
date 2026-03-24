import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { PageProps } from '../../types';

const AGENTS = [
  {
    icon: '🛰️',
    name: 'CropWatchAgent',
    sub: 'NDVI and drought monitoring from NASA HLS',
  },
  {
    icon: '🧠',
    name: 'AdvisoryAgent',
    sub: 'Gemini-powered contextual farm guidance',
  },
  {
    icon: '🛡️',
    name: 'InsuranceOracleAgent',
    sub: 'Autonomous claim checks and contract triggers',
  },
  {
    icon: '🪙',
    name: 'DataMarketplaceAgent',
    sub: 'ASAI rewards and NFT proof minting',
  },
];

const HeroSection: React.FC<PageProps> = ({ onEnterApp }) => {
  const [activeAgent, setActiveAgent] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveAgent((prev) => (prev + 1) % AGENTS.length);
    }, 2400);

    return () => clearInterval(interval);
  }, []);

  return (
    <section className="relative min-h-screen overflow-hidden bg-[#060d08] pt-24">
      <div className="absolute inset-0">
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse 90% 65% at 18% 30%, rgba(22,163,74,0.15) 0%, transparent 65%), radial-gradient(ellipse 70% 55% at 85% 70%, rgba(14,116,144,0.15) 0%, transparent 70%)',
          }}
        />
        <div
          className="absolute inset-0 opacity-[0.05]"
          style={{
            backgroundImage:
              'linear-gradient(#22c55e 1px, transparent 1px), linear-gradient(90deg, #22c55e 1px, transparent 1px)',
            backgroundSize: '64px 64px',
          }}
        />
      </div>

      <div className="relative z-10 mx-auto grid max-w-7xl grid-cols-1 gap-14 px-6 pb-20 pt-12 lg:grid-cols-2 lg:items-center lg:px-8">
        <div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mb-8 inline-flex items-center gap-2 rounded-full border border-emerald-700/50 bg-emerald-900/30 px-4 py-2 text-sm text-emerald-300"
          >
            <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
            <span>Autonomous Agents + Hedera Verified Decisions</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1 }}
            className="mb-6 text-5xl font-bold leading-[1.05] tracking-tight text-white sm:text-6xl lg:text-7xl"
            style={{ fontFamily: 'Syne, sans-serif' }}
          >
            AI agents that
            <br />
            <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
              monitor, advise,
            </span>
            <br />
            and execute for farms.
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.25 }}
            className="mb-10 max-w-xl text-lg leading-relaxed text-gray-300"
          >
            AgriSense AI coordinates crop monitoring, disease intelligence, autonomous insurance checks,
            and reward distribution in one auditable workflow. Every critical action is logged on Hedera HCS.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="mb-14 flex flex-col gap-4 sm:flex-row"
          >
            <button
              onClick={onEnterApp}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-8 py-4 font-semibold text-black transition-all duration-200 hover:bg-emerald-400"
            >
              Launch AgriSense AI
              <i className="fas fa-arrow-right" />
            </button>
            <a
              href="#video-demo"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/20 px-8 py-4 font-semibold text-white/80 transition-all duration-200 hover:border-white/40 hover:text-white"
            >
              <i className="fas fa-play-circle" />
              Watch Demo
            </a>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.55 }}
            className="grid grid-cols-3 gap-6 border-t border-white/10 pt-7"
          >
            <div>
              <div className="text-2xl font-bold text-emerald-400" style={{ fontFamily: 'Syne, sans-serif' }}>
                4
              </div>
              <div className="mt-1 text-sm text-gray-500">Autonomous Agents</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-cyan-400" style={{ fontFamily: 'Syne, sans-serif' }}>
                4
              </div>
              <div className="mt-1 text-sm text-gray-500">Dedicated HCS Topics</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-lime-400" style={{ fontFamily: 'Syne, sans-serif' }}>
                24/7
              </div>
              <div className="mt-1 text-sm text-gray-500">Oracle Monitoring</div>
            </div>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, x: 32 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, delay: 0.35 }}
          className="rounded-3xl border border-white/10 bg-white/[0.03] p-8 backdrop-blur-sm"
        >
          <div className="mb-6 text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">
            Live Agent Network
          </div>
          <div className="space-y-3">
            {AGENTS.map((agent, idx) => (
              <motion.div
                key={agent.name}
                animate={{
                  backgroundColor: idx === activeAgent ? 'rgba(16,185,129,0.14)' : 'rgba(255,255,255,0.03)',
                  borderColor: idx === activeAgent ? 'rgba(16,185,129,0.35)' : 'rgba(255,255,255,0.08)',
                }}
                className="flex items-center gap-4 rounded-xl border p-4"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-black/30 text-xl">
                  {agent.icon}
                </div>
                <div className="flex-1">
                  <div className={`text-sm font-semibold ${idx === activeAgent ? 'text-emerald-300' : 'text-gray-200'}`}>
                    {agent.name}
                  </div>
                  <div className="mt-0.5 text-xs text-gray-500">{agent.sub}</div>
                </div>
                {idx === activeAgent && <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />}
              </motion.div>
            ))}
          </div>

          <div className="mt-6 rounded-xl border border-cyan-900/30 bg-black/35 p-4">
            <div className="mb-2 flex items-center gap-2 text-xs text-cyan-300">
              <i className="fas fa-link" />
              Hedera Decision Trail
            </div>
            <p className="text-xs leading-relaxed text-gray-300">
              Each detection, advisory output, oracle decision, and marketplace reward is submitted to a dedicated
              consensus topic for transparent auditability.
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default HeroSection;