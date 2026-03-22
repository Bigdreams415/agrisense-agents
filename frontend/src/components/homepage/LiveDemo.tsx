// src/components/homepage/LiveDemo.tsx
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useInView } from 'react-intersection-observer';

const LiveDemo: React.FC = () => {
  const [ref, inView] = useInView({
    triggerOnce: true,
    threshold: 0.1,
  });

  const [activeTab, setActiveTab] = useState<'ai' | 'blockchain' | 'rewards'>('ai');

  const demoFeatures = {
    ai: {
      title: 'AI Pest Detection',
      description: 'Watch our AI identify pests and diseases in real-time with 95% accuracy.',
      image: '🔍',
      features: [
        'Real-time image analysis',
        'Multiple pest detection',
        'Health score calculation',
        'Treatment recommendations'
      ],
      stats: ['95% Accuracy', '2s Processing', '50+ Pest Types']
    },
    blockchain: {
      title: 'Blockchain Security',
      description: 'Every AI inference is timestamped and secured on the Hedera blockchain.',
      image: '⛓️',
      features: [
        'Tamper-proof records',
        'Instant verification',
        'Transparent audit trail',
        'Smart contract automation'
      ],
      stats: ['0.5s Finality', '$0.0001 Cost', 'Green Blockchain']
    },
    rewards: {
      title: 'Instant Rewards',
      description: 'Earn ASAI tokens automatically for good farming practices.',
      image: '💰',
      features: [
        'Automated token distribution',
        'Real-time reward tracking',
        'NFT marketplace access',
        'Insurance premium discounts'
      ],
      stats: ['Instant Payouts', 'Low Fees', 'Multiple Rewards']
    }
  };

  const activeDemo = demoFeatures[activeTab];

  return (
    <section id="live-demo" className="py-20 bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-800 dark:to-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 40 }}
          animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">
            See <span className="text-green-600">AgriSense AI</span> in Action
          </h2>
          <p className="text-lg sm:text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
            Experience the power of our platform through interactive demonstrations of key features.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Demo Content */}
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            animate={inView ? { opacity: 1, x: 0 } : { opacity: 0, x: -40 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            {/* Tab Navigation */}
            <div className="flex space-x-1 bg-gray-200 dark:bg-gray-700 rounded-xl p-1 mb-8">
              {(['ai', 'blockchain', 'rewards'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex-1 py-3 px-4 rounded-lg text-center transition-all ${
                    activeTab === tab
                      ? 'bg-white dark:bg-gray-800 text-green-600 shadow-sm'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  {tab === 'ai' && '🤖 AI Detection'}
                  {tab === 'blockchain' && '⛓️ Blockchain'}
                  {tab === 'rewards' && '💰 Rewards'}
                </button>
              ))}
            </div>

            {/* Demo Content */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 border border-gray-200 dark:border-gray-700">
              <div className="text-6xl mb-4">{activeDemo.image}</div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                {activeDemo.title}
              </h3>
              <p className="text-gray-600 dark:text-gray-300 mb-6">
                {activeDemo.description}
              </p>

              {/* Features */}
              <ul className="space-y-3 mb-6">
                {activeDemo.features.map((feature, index) => (
                  <li key={index} className="flex items-center text-gray-700 dark:text-gray-300">
                    <span className="w-2 h-2 bg-green-500 rounded-full mr-3"></span>
                    {feature}
                  </li>
                ))}
              </ul>

              {/* Stats */}
              <div className="flex space-x-4">
                {activeDemo.stats.map((stat, index) => (
                  <div key={index} className="text-center">
                    <div className="text-lg font-bold text-green-600">{stat}</div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Visualization */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={inView ? { opacity: 1, x: 0 } : { opacity: 0, x: 40 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="relative"
          >
            <div className="bg-gradient-to-br from-green-500 to-blue-600 rounded-2xl p-8 text-white text-center">
              <div className="text-8xl mb-4">🌱</div>
              <h4 className="text-2xl font-bold mb-3">Live Simulation</h4>
              <p className="opacity-90 mb-6">
                {activeTab === 'ai' && 'AI analyzing crop health in real-time...'}
                {activeTab === 'blockchain' && 'Blockchain securing data transactions...'}
                {activeTab === 'rewards' && 'Rewards being distributed automatically...'}
              </p>
              
              {/* Animated Progress */}
              <div className="w-full bg-white/20 rounded-full h-2 mb-4">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: '100%' }}
                  transition={{ duration: 2, repeat: Infinity, repeatType: 'reverse' }}
                  className="bg-white h-2 rounded-full"
                ></motion.div>
              </div>
              
              <div className="text-sm opacity-75">Live Demo Active</div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default LiveDemo;