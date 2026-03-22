export const ROUTES = [
  { id: 'workspace', name: 'AI Workspace', icon: 'fa-brain', color: 'teal' },
  { id: 'agents', name: 'Farm Intelligence', icon: 'fa-robot', color: 'green' },
  { id: 'dashboard', name: 'Dashboard', icon: 'fa-chart-line', color: 'gray' },
  { id: 'rewards', name: 'Rewards Center', icon: 'fa-award', color: 'amber' },
  { id: 'marketplace', name: 'Marketplace', icon: 'fa-store', color: 'gray' },
  { id: 'farm-management', name: 'My Farm', icon: 'fa-tractor', color: 'gray' },
  { id: 'settings', name: 'Settings', icon: 'fa-cog', color: 'gray' },
] as const;

export const SENSOR_CARDS = [
  {
    title: 'Soil Moisture',
    value: '45',
    unit: '%',
    icon: 'fa-tint',
    color: 'text-blue-600',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30',
  },
  {
    title: 'Temperature',
    value: '24',
    unit: '°C',
    icon: 'fa-thermometer-half',
    color: 'text-orange-600',
    bgColor: 'bg-orange-100 dark:bg-orange-900/30',
  },
  {
    title: 'Air Humidity',
    value: '60',
    unit: '%',
    icon: 'fa-cloud',
    color: 'text-cyan-600',
    bgColor: 'bg-cyan-100 dark:bg-cyan-900/30',
  },
] as const;

export const STAT_CARDS = [
  {
    title: 'Predicted Yield',
    value: '1200',
    unit: 'kg/ha',
    icon: 'fa-seedling',
    color: 'text-green-600',
    bgColor: 'bg-green-100 dark:bg-green-900/30',
  },
  {
    title: 'Annual Rainfall',
    value: '800',
    unit: 'mm/year',
    icon: 'fa-cloud-rain',
    color: 'text-blue-600',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30',
  },
] as const;