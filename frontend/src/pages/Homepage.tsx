// src/pages/Homepage.tsx
import React from 'react';
import { PageProps } from '../types';
import Navigation from '../components/common/Navigation';
import HeroSection from '../components/homepage/HeroSection';
import ProblemSection from '../components/homepage/ProblemSection';
import SolutionSection from '../components/homepage/SolutionSection';
import HowItWorks from '../components/homepage/HowItWorks';
import LiveDemo from '../components/homepage/LiveDemo';
import VideoDemoSection from '../components/homepage/VideoDemoSection';
import Footer from '../components/common/Footer';

const Homepage: React.FC<PageProps> = ({ onEnterApp }) => {
  return (
    <div className="homepage">
      <Navigation onEnterApp={onEnterApp} />
      <HeroSection onEnterApp={onEnterApp} />
      <VideoDemoSection />
      <ProblemSection />
      <SolutionSection />
      <HowItWorks />
      <LiveDemo />
      <Footer />
    </div>
  );
};

export default Homepage;