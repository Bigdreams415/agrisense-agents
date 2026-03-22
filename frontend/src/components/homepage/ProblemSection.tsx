// src/components/homepage/ProblemSection.tsx
import React from 'react';
import { motion } from 'framer-motion';
import { useInView } from 'react-intersection-observer';

const ProblemSection: React.FC = () => {
  const [ref, inView] = useInView({
    triggerOnce: true,
    threshold: 0.1,
  });

  const problems = [
    {
      icon: '🐛',
      title: 'Pest & Disease Devastation',
      description: 'Farmers lose up to 40% of their crops to pests and diseases annually, with traditional detection methods being too slow and inaccurate.',
      stat: '$220B',
      statText: 'Annual global crop losses'
    },
    {
      icon: '🌡️',
      title: 'Climate Change Impact',
      description: 'Unpredictable weather patterns and droughts make farming increasingly risky, with insurance claims taking months to process.',
      stat: '70%',
      statText: 'Of farmers affected by climate change'
    },
    {
      icon: '💸',
      title: 'Financial Instability',
      description: 'Farmers struggle with cash flow between seasons and lack access to modern financial tools that could help them grow.',
      stat: '500M',
      statText: 'Small farms lack access to credit'
    },
    {
      icon: '📊',
      title: 'Data Silos & Inefficiency',
      description: 'Valuable farm data remains unused and siloed, preventing farmers from making data-driven decisions that could optimize yields.',
      stat: '80%',
      statText: 'Of farm data goes unanalyzed'
    }
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 50 },
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
    <section id="problem" className="py-20 bg-white dark:bg-gray-900 relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, rgba(0,0,0,0.1) 1px, transparent 0)`,
          backgroundSize: '50px 50px'
        }}></div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <motion.div
          ref={ref}
          initial="hidden"
          animate={inView ? "visible" : "hidden"}
          variants={containerVariants}
          className="text-center mb-16"
        >
          <motion.h2 
            variants={itemVariants}
            className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4"
          >
            The <span className="text-red-600">Challenges</span> Modern Farmers Face
          </motion.h2>
          <motion.p 
            variants={itemVariants}
            className="text-lg sm:text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto"
          >
            Traditional farming methods are no longer sufficient in today's rapidly changing agricultural landscape. 
            Farmers need smarter solutions to overcome these critical challenges.
          </motion.p>
        </motion.div>

        <motion.div
          initial="hidden"
          animate={inView ? "visible" : "hidden"}
          variants={containerVariants}
          className="grid grid-cols-1 md:grid-cols-2 gap-8"
        >
          {problems.map((problem, index) => (
            <motion.div
              key={index}
              variants={itemVariants}
              whileHover={{ 
                y: -5,
                transition: { duration: 0.2 }
              }}
              className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-8 hover:shadow-xl transition-all duration-300 border border-gray-200 dark:border-gray-700"
            >
              <div className="flex items-start space-x-4">
                <div className="text-4xl">{problem.icon}</div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                    {problem.title}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300 mb-4">
                    {problem.description}
                  </p>
                  <div className="flex items-center space-x-2">
                    <span className="text-2xl font-bold text-red-600">{problem.stat}</span>
                    <span className="text-sm text-gray-500 dark:text-gray-400">{problem.statText}</span>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Callout Box */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 50 }}
          transition={{ duration: 0.6, delay: 0.8 }}
          className="mt-16 bg-gradient-to-r from-red-500 to-orange-500 rounded-2xl p-8 text-center text-white"
        >
          <h3 className="text-2xl font-bold mb-2">The Urgent Need for Innovation</h3>
          <p className="text-lg opacity-90">
            Without modern solutions, these challenges will continue to threaten global food security and farmer livelihoods.
          </p>
        </motion.div>
      </div>
    </section>
  );
};

export default ProblemSection;