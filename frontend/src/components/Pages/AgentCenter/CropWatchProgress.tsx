import React, { useState, useEffect } from 'react';

const CROPWATCH_STEPS = [
  {
    icon: 'fa-satellite',
    label: 'Connecting to NASA Earthdata',
    detail: 'Authenticating with NASA HLS Sentinel-2 servers...',
    color: 'text-blue-400',
    bg: 'bg-blue-500',
    duration: 4000,
  },
  {
    icon: 'fa-search',
    label: 'Searching for satellite granules',
    detail: 'Querying HLS S30 imagery for your farm boundaries...',
    color: 'text-indigo-400',
    bg: 'bg-indigo-500',
    duration: 6000,
  },
  {
    icon: 'fa-cloud-download-alt',
    label: 'Downloading spectral bands',
    detail: 'Fetching B03, B04, B08 bands + Fmask cloud layer...',
    color: 'text-purple-400',
    bg: 'bg-purple-500',
    duration: 25000,
  },
  {
    icon: 'fa-calculator',
    label: 'Computing NDVI & NDWI indices',
    detail: 'Calculating vegetation health and drought risk from spectral data...',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500',
    duration: 8000,
  },
  {
    icon: 'fa-shield-alt',
    label: 'Evaluating insurance conditions',
    detail: 'Checking NDVI thresholds against insurance oracle parameters...',
    color: 'text-green-400',
    bg: 'bg-green-500',
    duration: 99999,
  },
];

const CropWatchProgress: React.FC = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [stepProgress, setStepProgress] = useState(0);

  useEffect(() => {
    setCurrentStep(0);
    setStepProgress(0);
  }, []);

  useEffect(() => {
    if (currentStep >= CROPWATCH_STEPS.length - 1) return;

    const step = CROPWATCH_STEPS[currentStep];
    const tickInterval = 50;
    const totalTicks = step.duration / tickInterval;
    let ticks = 0;

    const timer = setInterval(() => {
      ticks++;
      const progress = Math.min((ticks / totalTicks) * 100, 100);
      setStepProgress(progress);
      if (ticks >= totalTicks) {
        clearInterval(timer);
        setCurrentStep(prev => prev + 1);
        setStepProgress(0);
      }
    }, tickInterval);

    return () => clearInterval(timer);
  }, [currentStep]);

  const overallProgress =
    (currentStep / CROPWATCH_STEPS.length) * 100 +
    stepProgress / CROPWATCH_STEPS.length;

  return (
    <div className="mt-2 space-y-3">
      {/* Overall bar */}
      <div>
        <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
          <span>CropWatch Agent Progress</span>
          <span>{Math.round(overallProgress)}%</span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 overflow-hidden">
          <div
            className="h-1.5 rounded-full bg-gradient-to-r from-blue-500 via-indigo-500 to-green-500 transition-all duration-300"
            style={{ width: `${overallProgress}%` }}
          />
        </div>
      </div>

      {/* Steps */}
      <div className="space-y-2">
        {CROPWATCH_STEPS.map((step, index) => {
          const isDone = index < currentStep;
          const isActive = index === currentStep;

          return (
            <div
              key={index}
              className={`flex items-start space-x-2 p-2 rounded-lg transition-all duration-300 ${
                isActive
                  ? 'bg-blue-500/10 border border-blue-500/20'
                  : isDone
                  ? 'opacity-60'
                  : 'opacity-25'
              }`}
            >
              {/* Icon */}
              <div className={`w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 ${
                isDone ? 'bg-green-500/20' :
                isActive ? 'bg-blue-500/20' :
                'bg-gray-500/20'
              }`}>
                {isDone ? (
                  <i className="fas fa-check text-green-400 text-xs"></i>
                ) : (
                  <i className={`fas ${step.icon} text-xs ${
                    isActive ? `${step.color} animate-pulse` : 'text-gray-500'
                  }`}></i>
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className={`text-xs font-medium ${
                  isDone ? 'text-green-400' :
                  isActive ? 'text-gray-200' :
                  'text-gray-500'
                }`}>
                  {step.label}
                  {isDone && <span className="ml-1 text-green-500">✓</span>}
                </div>

                {isActive && (
                  <>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      {step.detail}
                    </p>

                    {/* Step progress bar */}
                    {index < CROPWATCH_STEPS.length - 1 && (
                      <div className="mt-1.5 w-full bg-gray-700 rounded-full h-1 overflow-hidden">
                        <div
                          className={`h-1 rounded-full ${step.bg} transition-all duration-100`}
                          style={{ width: `${stepProgress}%` }}
                        />
                      </div>
                    )}

                    {/* Final step pulsing dots */}
                    {index === CROPWATCH_STEPS.length - 1 && (
                      <div className="flex space-x-1 mt-1.5">
                        {[0, 1, 2].map(i => (
                          <div
                            key={i}
                            className="w-1.5 h-1.5 rounded-full bg-green-500 animate-bounce"
                            style={{ animationDelay: `${i * 150}ms` }}
                          />
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Info note */}
      <p className="text-xs text-gray-500 dark:text-gray-500 text-center pt-1">
        <i className="fas fa-info-circle mr-1"></i>
        Sentinel-2 captures Earth at 10m resolution. Using real NASA HLS data.
      </p>
    </div>
  );
};

export default CropWatchProgress;