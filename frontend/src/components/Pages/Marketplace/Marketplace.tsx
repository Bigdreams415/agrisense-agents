import React from "react";

const Marketplace: React.FC = () => {
  const upcomingFeatures = [
    {
      icon: "🌱",
      title: "Crop Trading Platform",
      description: "AI-powered crop valuation and direct buyer matching with blockchain settlement",
      status: "Q1 2026",
      color: "green",
      features: ["Smart pricing algorithms", "Instant blockchain payments", "Quality verification", "Logistics integration"]
    },
    {
      icon: "🖼️", 
      title: "Digital Asset Exchange",
      description: "Trade prediction NFTs, agricultural data tokens, and farming intellectual property",
      status: "Q2 2026",
      color: "purple",
      features: ["Prediction history NFTs", "Data tokenization", "Royalty sharing", "IP marketplace"]
    },
    {
      icon: "🛠️",
      title: "Smart Equipment Hub",
      description: "IoT equipment rental with performance analytics and automated maintenance",
      status: "Q3 2026",
      color: "blue",
      features: ["Sensor performance tracking", "Predictive maintenance", "Usage-based pricing", "Remote monitoring"]
    },
    {
      icon: "📊",
      title: "Data Marketplace",
      description: "Monetize your farm data and purchase AI-driven agricultural insights",
      status: "Q4 2026",
      color: "orange",
      features: ["Data tokenization", "AI prediction models", "Market trend analysis", "Yield optimization"]
    }
  ];

  const blockchainStats = [
    { value: "0.000s", label: "Avg. Transaction Speed", icon: "⚡" },
    { value: "$0.001", label: "Avg. Transaction Cost", icon: "💸" },
    { value: "100%", label: "Uptime Guarantee", icon: "🛡️" },
    { value: "∞", label: "Scalability", icon: "🚀" }
  ];

  return (
    <div className="animate-fadeIn p-6">
      {/* Futuristic Header */}
      <div className="text-center mb-12">
        <div className="w-20 h-20 bg-gradient-to-r from-green-500 to-blue-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <i className="fas fa-store text-white text-3xl"></i>
        </div>
        <h3 className="text-4xl font-bold mb-4 gradient-text">AgriSense Marketplace</h3>
        <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
          The future of agricultural commerce powered by blockchain and AI
        </p>
      </div>

      {/* Blockchain-Powered Banner */}
      <div className="bg-gradient-to-r from-purple-600 via-blue-600 to-green-600 rounded-2xl p-8 mb-8 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="relative z-10">
          <div className="flex flex-col md:flex-row items-center justify-between">
            <div className="flex-1 mb-6 md:mb-0">
              <h4 className="text-2xl font-bold mb-2">Blockchain-Powered Agriculture</h4>
              <p className="text-blue-100 text-lg">
                Every transaction secured on Hedera Hashgraph. Transparent, fast, and cost-effective.
              </p>
            </div>
            <div className="flex gap-4">
              <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4 text-center">
                <div className="text-2xl font-bold">HBAR</div>
                <div className="text-sm opacity-80">Native Currency</div>
              </div>
              <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4 text-center">
                <div className="text-2xl font-bold">HTS</div>
                <div className="text-sm opacity-80">Token Service</div>
              </div>
              <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4 text-center">
                <div className="text-2xl font-bold">HCS</div>
                <div className="text-sm opacity-80">Consensus</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Features Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
        {upcomingFeatures.map((feature, index) => (
          <div key={index} className="bg-white/80 dark:bg-gray-800/80 glass rounded-2xl p-8 hover-lift group">
            <div className="flex items-start justify-between mb-6">
              <div className="text-5xl group-hover:scale-110 transition-transform duration-300">
                {feature.icon}
              </div>
              <span className={`px-4 py-2 rounded-full text-sm font-semibold ${
                feature.color === 'green' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' :
                feature.color === 'purple' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300' :
                feature.color === 'blue' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' :
                'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300'
              }`}>
                {feature.status}
              </span>
            </div>
            
            <h4 className="font-bold text-2xl mb-3 text-gray-800 dark:text-white">{feature.title}</h4>
            <p className="text-gray-600 dark:text-gray-400 text-lg mb-6">{feature.description}</p>
            
            {/* Feature List */}
            <div className="space-y-3">
              {feature.features.map((feat, featIndex) => (
                <div key={featIndex} className="flex items-center gap-3">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                    feature.color === 'green' ? 'bg-green-100 text-green-600' :
                    feature.color === 'purple' ? 'bg-purple-100 text-purple-600' :
                    feature.color === 'blue' ? 'bg-blue-100 text-blue-600' :
                    'bg-orange-100 text-orange-600'
                  }`}>
                    <i className="fas fa-check text-xs"></i>
                  </div>
                  <span className="text-gray-700 dark:text-gray-300 font-medium">{feat}</span>
                </div>
              ))}
            </div>

            {/* Blockchain Integration Badge */}
            <div className="mt-6 p-3 bg-gradient-to-r from-gray-800 to-gray-900 rounded-lg text-white text-center">
              <div className="flex items-center justify-center gap-2 text-sm">
                <i className="fas fa-link"></i>
                <span>Powered by Hedera Hashgraph</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Performance Stats */}
      <div className="bg-white/80 dark:bg-gray-800/80 glass rounded-2xl p-8 mb-8">
        <h4 className="text-2xl font-bold text-center mb-8 text-gray-800 dark:text-white">
          Blockchain Performance Metrics
        </h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {blockchainStats.map((stat, index) => (
            <div key={index} className="text-center group">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                <span className="text-2xl text-white">{stat.icon}</span>
              </div>
              <div className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
                {stat.value}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Early Access Section */}
      <div className="bg-gradient-to-r from-green-500 to-blue-500 rounded-2xl p-8 text-white">
        <div className="flex flex-col lg:flex-row items-center justify-between">
          <div className="flex-1 mb-6 lg:mb-0">
            <h4 className="text-2xl font-bold mb-3">Get Early Access</h4>
            <p className="text-blue-100 text-lg">
              Be among the first to experience the future of agricultural commerce. 
              Early adopters get exclusive benefits and premium features.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4 text-center">
              <div className="text-2xl font-bold">5% OFF</div>
              <div className="text-sm opacity-80">First Year Fees</div>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4 text-center">
              <div className="text-2xl font-bold">Priority</div>
              <div className="text-sm opacity-80">Feature Access</div>
            </div>
          </div>
        </div>

        {/* Newsletter Signup */}
        <div className="mt-6 max-w-2xl mx-auto">
          <div className="flex flex-col sm:flex-row gap-3">
            <input 
              type="email" 
              placeholder="Enter your email for early access"
              className="flex-1 px-6 py-4 rounded-xl border-0 bg-white/20 backdrop-blur-sm text-white placeholder-blue-200 focus:ring-2 focus:ring-white focus:bg-white/30 transition-all"
            />
            <button className="px-8 py-4 bg-white text-green-600 rounded-xl font-bold hover:bg-gray-100 transition-colors flex items-center gap-2">
              <i className="fas fa-rocket"></i>
              Join Waitlist
            </button>
          </div>
          <p className="text-blue-200 text-sm text-center mt-3">
            No spam. Exclusive updates and early access only.
          </p>
        </div>
      </div>

      {/* Roadmap Preview */}
      <div className="mt-8 text-center">
        <p className="text-gray-600 dark:text-gray-400">
          Built on <strong>Hedera Hashgraph</strong> • Enterprise-grade blockchain for sustainable agriculture
        </p>
        <div className="flex justify-center gap-6 mt-4">
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            <i className="fas fa-bolt text-green-500"></i>
            <span>Carbon Negative</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            <i className="fas fa-shield-alt text-blue-500"></i>
            <span>Military-Grade Security</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            <i className="fas fa-infinity text-purple-500"></i>
            <span>Infinite Scalability</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Marketplace;