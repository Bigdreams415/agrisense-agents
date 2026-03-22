import { TypingPhrases } from '../types/workspace';

export const TYPING_PHRASES: TypingPhrases = {
  pest: [
    "🔍 Analyzing leaf patterns for pest signatures...",
    "🦟 Detecting insect damage patterns...",
    "🌿 Identifying fungal spore formations...",
    "📷 Processing image for disease biomarkers...",
    "🤖 Running deep learning pest detection model..."
  ],
  yield: [
    "📊 Analyzing growth patterns for yield prediction...",
    "🌾 Calculating biomass accumulation rates...",
    "📈 Estimating harvest potential from current data...",
    "🔮 Predicting yield based on historical patterns...",
    "🌱 Assessing crop health for yield optimization..."
  ],
  irrigation: [  // Changed from 'drought'
    "💧 Analyzing soil moisture levels...",
    "🌡️ Monitoring temperature and humidity...",
    "🛰️ Processing satellite data for water needs...",
    "💦 Calculating optimal irrigation schedule...",
    "⚠️ Assessing water stress indicators..."
  ]
};

export const MODELS = [
  { id: 'pest', name: 'Pest Detection', icon: 'fa-bug' },
  { id: 'yield', name: 'Yield Prediction', icon: 'fa-chart-line' },
  { id: 'irrigation', name: 'Smart Irrigation', icon: 'fa-tint' }  // Changed icon
] as const;

export const DATA_SOURCES = [
  { id: 'upload', name: 'Upload', icon: 'fa-upload' },
  { id: 'camera', name: 'Live Camera', icon: 'fa-camera' },
  { id: 'drone', name: 'Drone Feed', icon: 'fa-drone' },
  { id: 'satellite', name: 'Satellite', icon: 'fa-satellite' }
] as const;