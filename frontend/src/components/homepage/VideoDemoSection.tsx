// components/VideoDemoSection.tsx
'use client';
import { motion } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import { useState, useRef } from 'react';

export default function VideoDemoSection() {
  const [ref, inView] = useInView({
    triggerOnce: true,
    threshold: 0.1,
  });

  const [activeVideo, setActiveVideo] = useState<'quick' | 'detailed'>('quick');
  const videoRef = useRef<HTMLIFrameElement>(null);

  const timestamps = [
    { time: 0, label: 'Introduction', emoji: '👋' },
    { time: 30, label: 'The Problem', emoji: '🎯' },
    { time: 75, label: 'AI Detection', emoji: '🤖' },
    { time: 120, label: 'Blockchain Security', emoji: '⛓️' },
    { time: 165, label: 'Token Rewards', emoji: '💰' }
  ];

  const seekTo = (seconds: number) => {
    if (videoRef.current) {
      videoRef.current.src = `https://www.youtube.com/embed/YOUR_3MIN_VIDEO_ID?start=${seconds}&autoplay=1`;
    }
  };

  return (
    <section id="video-demo" className="py-24 bg-gradient-to-br from-green-50 via-blue-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 relative overflow-hidden">
      {/* Animated background   */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-green-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute top-40 left-40 w-80 h-80 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000"></div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Enhanced Header */}
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 40 }}
          animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }}
          className="text-center mb-16"
        >
          <motion.h2 
            className="text-4xl sm:text-5xl md:text-6xl font-bold text-gray-900 dark:text-white mb-6"
          >
            See <span className="bg-gradient-to-r from-green-600 via-blue-600 to-purple-600 bg-clip-text text-transparent">AgriSense AI</span> Live
          </motion.h2>
          <motion.p 
            className="text-xl sm:text-2xl text-gray-600 dark:text-gray-300 max-w-4xl mx-auto leading-relaxed"
          >
            Experience the future of farming through our interactive demo videos. See how AI and blockchain work together to protect and reward farmers.
          </motion.p>
        </motion.div>

        {/* Video Selection Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
          transition={{ delay: 0.2 }}
          className="flex justify-center mb-12"
        >
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-2 shadow-lg border border-gray-200 dark:border-gray-700">
            <div className="flex space-x-2">
              <button
                onClick={() => setActiveVideo('quick')}
                className={`px-8 py-4 rounded-xl text-lg font-semibold transition-all duration-300 ${
                  activeVideo === 'quick'
                    ? 'bg-gradient-to-r from-green-500 to-green-600 text-white shadow-lg'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                🚀 3-Min Quick Demo
              </button>
              <button
                onClick={() => setActiveVideo('detailed')}
                className={`px-8 py-4 rounded-xl text-lg font-semibold transition-all duration-300 ${
                  activeVideo === 'detailed'
                    ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                📚 10-Min Detailed Walkthrough
              </button>
            </div>
          </div>
        </motion.div>

        {/* Main Video Container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={inView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.95 }}
          transition={{ delay: 0.3 }}
          className="mb-16"
        >
          <div className="bg-white dark:bg-gray-800 rounded-3xl p-8 shadow-2xl border border-gray-200 dark:border-gray-700">
            {/* Large Video Player */}
            <div className="relative rounded-2xl overflow-hidden bg-black">
                <iframe
                  ref={videoRef}
                  src={`https://www.youtube.com/embed/${
                    activeVideo === 'quick' ? 'Lq_KbfINthI' : 'jDuCTASqhio'
                  }?autoplay=0&rel=0&modestbranding=1`}
                  title={activeVideo === 'quick' ? 'AgriSense AI - 3 Min Demo' : 'AgriSense AI - 10 Min Walkthrough'}
                  allowFullScreen
                  className="w-full h-80 sm:h-96 md:h-[500px] lg:h-[600px]"
                />
              {/* Video Overlay Info */}
              <div className="absolute bottom-4 left-4 bg-black/70 text-white px-4 py-2 rounded-lg backdrop-blur-sm">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                  <span className="text-sm font-medium">
                    {activeVideo === 'quick' ? '3-Minute Quick Demo' : '10-Minute Detailed Walkthrough'}
                  </span>
                </div>
              </div>
            </div>

            {/* Enhanced Timestamp Navigation - Only for quick demo */}
            {activeVideo === 'quick' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-8"
              >
                <h4 className="text-xl font-bold text-gray-900 dark:text-white mb-6 text-center">🎬 Jump to Specific Section</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                  {timestamps.map(({ time, label, emoji }) => (
                    <motion.button
                      key={time}
                      onClick={() => seekTo(time)}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="flex flex-col items-center p-4 bg-gray-50 dark:bg-gray-700 rounded-xl hover:bg-green-50 dark:hover:bg-green-900/20 border border-gray-200 dark:border-gray-600 transition-all duration-300 group"
                    >
                      <span className="text-2xl mb-2 group-hover:scale-110 transition-transform">{emoji}</span>
                      <span className="text-sm font-semibold text-gray-900 dark:text-white text-center">{label}</span>
                      <span className="text-xs text-green-600 dark:text-green-400 font-mono mt-1">
                        {Math.floor(time / 60)}:{(time % 60).toString().padStart(2, '0')}
                      </span>
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            )}
          </div>
        </motion.div>

        {/* Stats & Features */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }}
          transition={{ delay: 0.5 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto"
        >
          <div className="text-center p-6 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700">
            <div className="text-3xl mb-3">⏱️</div>
            <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Respects Your Time</h4>
            <p className="text-gray-600 dark:text-gray-400 text-sm">
                Get the full picture in just 3 minutes - perfect for busy evaluation schedules
            </p>
            </div>
          <div className="text-center p-6 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700">
            <div className="text-3xl mb-3">🚀</div>
            <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Ready in Minutes</h4>
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              See the complete workflow from farm connection to reward distribution
            </p>
          </div>

          <div className="text-center p-6 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700">
            <div className="text-3xl mb-3">💡</div>
            <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Deep Understanding</h4>
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              Detailed 10-minute walkthrough for comprehensive feature exploration
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}