import React from 'react';
import { motion } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
const VIDEO_URL = 'https://www.youtube.com/embed/Gq1DeSbOIIU?rel=0&modestbranding=1';

const VideoDemoSection: React.FC = () => {
  const [ref, inView] = useInView({ triggerOnce: true, threshold: 0.1 });

  return (
    <section id="video-demo" className="relative overflow-hidden bg-[#060f09] py-24">
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            'linear-gradient(#22c55e 1px, transparent 1px), linear-gradient(90deg, #22c55e 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }}
      />

      <div className="relative z-10 mx-auto max-w-5xl px-6 lg:px-8">
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 40 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7 }}
          className="mb-12 text-center"
        >
          <p className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-emerald-400">Demo Video</p>
          <h2
            className="mx-auto max-w-3xl text-4xl font-bold leading-tight text-white sm:text-5xl"
            style={{ fontFamily: 'Syne, sans-serif' }}
          >
            See the full agent workflow in action.
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-gray-400">
            From data ingestion to advisory output, reward flow, and on-chain proof, this walkthrough shows how the end-to-end system behaves in real scenarios.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={inView ? { opacity: 1, scale: 1 } : {}}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="aspect-video overflow-hidden rounded-2xl border border-white/10 bg-black shadow-2xl"
        >
          <iframe src={VIDEO_URL} title="AgriSense AI Demo" allowFullScreen className="h-full w-full" />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.45 }}
          className="mt-8 rounded-xl border border-emerald-900/40 bg-emerald-950/25 p-4"
        >
          <p className="text-sm text-gray-300">
            <i className="fas fa-circle mr-2 text-xs text-red-400" />
            Updated demo source: https://youtu.be/Gq1DeSbOIIU
          </p>
        </motion.div>
      </div>
    </section>
  );
};

export default VideoDemoSection;