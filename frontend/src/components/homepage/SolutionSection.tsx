// src/components/homepage/SolutionSection.tsx
import React from 'react';
import { motion } from 'framer-motion';
import { useInView } from 'react-intersection-observer';

const SolutionSection: React.FC = () => {
  const [ref, inView] = useInView({
    triggerOnce: true,
    threshold: 0.1,
  });

  const solutions = [
    {
      icon: '🤖',
      title: 'AI-Powered Insights',
      description: 'Advanced computer vision algorithms analyze drone and satellite imagery to detect pests, diseases, and crop health issues with 95% accuracy.',
      features: ['Real-time pest detection', 'Vegetation health monitoring', 'Predictive analytics'],
      color: 'from-blue-500 to-blue-600',
      bgColor: 'blue'
    },
    {
      icon: '💰',
      title: 'Economic Empowerment',
      description: 'Earn ASAI tokens for sustainable practices, trade crop prediction NFTs, and access decentralized insurance with instant payouts.',
      features: ['Token rewards system', 'Crop prediction marketplace', 'Automated insurance'],
      color: 'from-green-500 to-green-600',
      bgColor: 'green'
    },
    {
      icon: '⛓️',
      title: 'DePIN Innovation',
      description: 'Rent drones and IoT sensors through our decentralized physical infrastructure network, with all data secured on Hedera blockchain.',
      features: ['Equipment rental marketplace', 'Tamper-proof records', 'Smart contract automation'],
      color: 'from-purple-500 to-purple-600',
      bgColor: 'purple'
    }
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.3
      }
    }
  };

  const cardVariants = {
    hidden: { 
      opacity: 0, 
      y: 60, 
      scale: 0.9 
    },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        duration: 0.7,
        ease: "easeOut" as const
      }
    }
  };

  const headerVariants = {
    hidden: { 
      opacity: 0, 
      y: 40 
    },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        ease: "easeOut" as const
      }
    }
  };

  return (
    <section id="solution" className="py-20 bg-gradient-to-br from-gray-50 to-green-50 dark:from-gray-800 dark:to-gray-900 relative overflow-hidden">
      {/* Subtle background pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 25% 25%, #10B981 0%, transparent 50%)`,
          backgroundSize: '50px 50px'
        }}></div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section Header */}
        <motion.div
          ref={ref}
          initial="hidden"
          animate={inView ? "visible" : "hidden"}
          variants={containerVariants}
          className="text-center mb-16"
        >
          <motion.h2 
            variants={headerVariants}
            className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4"
          >
            Our <span className="text-green-600">Triple-Threat</span> Solution
          </motion.h2>
          <motion.p 
            variants={headerVariants}
            className="text-lg sm:text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto"
          >
            AgriSense AI combines cutting-edge AI, economic innovation, and decentralized infrastructure 
            to create the most comprehensive farming platform ever built.
          </motion.p>
        </motion.div>

        {/* Solution Cards */}
        <motion.div
          initial="hidden"
          animate={inView ? "visible" : "hidden"}
          variants={containerVariants}
          className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-16"
        >
          {solutions.map((solution, index) => (
            <motion.div
              key={index}
              variants={cardVariants}
              whileHover={{ 
                y: -8,
                scale: 1.02,
                transition: { duration: 0.3 }
              }}
              className="group relative"
            >
              {/* Gradient Border Effect */}
              <div className={`absolute inset-0 bg-gradient-to-r ${solution.color} rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-sm`}></div>
              
              <div className="relative bg-white dark:bg-gray-800 rounded-2xl p-8 h-full border border-gray-200 dark:border-gray-700 group-hover:border-transparent transition-all duration-300">
                {/* Icon */}
                <div className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-${solution.bgColor}-100 dark:bg-${solution.bgColor}-900/30 text-2xl mb-6`}>
                  {solution.icon}
                </div>

                {/* Title */}
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                  {solution.title}
                </h3>

                {/* Description */}
                <p className="text-gray-600 dark:text-gray-300 mb-6 leading-relaxed">
                  {solution.description}
                </p>

                {/* Features */}
                <ul className="space-y-2">
                  {solution.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-center text-gray-700 dark:text-gray-300">
                      <span className="w-2 h-2 bg-green-500 rounded-full mr-3"></span>
                      {feature}
                    </li>
                  ))}
                </ul>

                {/* Bottom Gradient Bar */}
                <div className={`absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r ${solution.color} rounded-b-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300`}></div>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Integration Callout */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }}
          transition={{ duration: 0.6, delay: 0.9 }}
          className="bg-white dark:bg-gray-800 rounded-2xl p-8 border border-green-200 dark:border-green-800 text-center"
        >
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Seamless Integration, Maximum Impact
          </h3>
          <p className="text-lg text-gray-600 dark:text-gray-300 mb-6">
            All three components work together to create a powerful ecosystem that benefits farmers, 
            investors, and the entire agricultural supply chain.
          </p>
          <div className="flex justify-center items-center space-x-8 text-sm text-gray-500 dark:text-gray-400">
            <span>🤖 AI Analysis</span>
            <span className="text-green-500">→</span>
            <span>💰 Token Rewards</span>
            <span className="text-green-500">→</span>
            <span>⛓️ Blockchain Security</span>
            <span className="text-green-500">→</span>
            <span>📈 Better Yields</span>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default SolutionSection;