export interface ThemeContextType {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
}

export interface Route {
  id: string;
  name: string;
  icon: string;
  color: string;
}

export interface StatCard {
  title: string;
  value: string;
  icon: string;
  trend: {
    value: string;
    isPositive: boolean;
  };
}

export interface PageProps {
  onEnterApp: () => void;
  onBackToHomepage?: () => void;
}

export interface FeatureCard {
  icon: string;
  title: string;
  description: string;
  color: string;
}

export interface Problem {
  icon: string;
  title: string;
  description: string;
  stat: string;
  statText: string;
}