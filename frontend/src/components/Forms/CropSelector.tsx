import React from 'react';

const CROPS = [
  { id: 'maize', name: 'Maize', icon: '🌽' },
  { id: 'cassava', name: 'Cassava', icon: '🥔' },
  { id: 'beans', name: 'Beans', icon: '🫘' },
  { id: 'rice', name: 'Rice', icon: '🍚' },
  { id: 'sorghum', name: 'Sorghum', icon: '🌾' },
  { id: 'millet', name: 'Millet', icon: '🌾' },
  { id: 'vegetables', name: 'Vegetables', icon: '🥬' },
  { id: 'other', name: 'Other Crops', icon: '🌱' }
];

const CropSelector: React.FC<{
  selectedCrop: string;
  onCropSelect: (cropId: string) => void;
}> = ({ selectedCrop, onCropSelect }) => {
  return (
    <div className="crop-selector">
      <label className="block text-sm font-medium mb-3 text-gray-700 dark:text-gray-300">
        Select Main Crop
      </label>
      
      <div className="grid grid-cols-4 gap-2">
        {CROPS.map((crop) => (
          <button
            key={crop.id}
            className={`p-3 rounded-lg border-2 text-center transition-all ${
              selectedCrop === crop.id
                ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                : 'border-gray-200 dark:border-gray-600 hover:border-green-300'
            }`}
            onClick={() => onCropSelect(crop.id)}
          >
            <div className="text-2xl mb-1">{crop.icon}</div>
            <div className="text-xs font-medium">{crop.name}</div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default CropSelector;