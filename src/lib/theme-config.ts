// Professional color palette for the Ethereum parallel execution dashboard
export const themeColors = {
  // Primary colors - Purple
  primary: {
    50: '#f5f3ff',
    100: '#ede9fe',
    200: '#ddd6fe',
    300: '#c4b5fd',
    400: '#a78bfa',
    500: '#8b5cf6', // Main primary color
    600: '#7c3aed',
    700: '#6d28d9',
    800: '#5b21b6',
    900: '#4c1d95',
    950: '#2e1065',
  },
  
  // Secondary colors - Teal
  secondary: {
    50: '#f0fdfa',
    100: '#ccfbf1',
    200: '#99f6e4',
    300: '#5eead4',
    400: '#2dd4bf',
    500: '#14b8a6', // Main secondary color
    600: '#0d9488',
    700: '#0f766e',
    800: '#115e59',
    900: '#134e4a',
    950: '#042f2e',
  },
  
  // Success colors - Green
  success: {
    50: '#f0fdf4',
    100: '#dcfce7',
    200: '#bbf7d0',
    300: '#86efac',
    400: '#4ade80',
    500: '#22c55e', // Main success color
    600: '#16a34a',
    700: '#15803d',
    800: '#166534',
    900: '#14532d',
    950: '#052e16',
  },
  
  // Warning colors - Orange
  warning: {
    50: '#fff7ed',
    100: '#ffedd5',
    200: '#fed7aa',
    300: '#fdba74',
    400: '#fb923c',
    500: '#f97316', // Main warning color
    600: '#ea580c',
    700: '#c2410c',
    800: '#9a3412',
    900: '#7c2d12',
    950: '#431407',
  },
  
  // Neutral colors - Cool Gray
  neutral: {
    50: '#f9fafb',
    100: '#f3f4f6',
    200: '#e5e7eb',
    300: '#d1d5db',
    400: '#9ca3af',
    500: '#6b7280', // Main neutral color
    600: '#4b5563',
    700: '#374151',
    800: '#1f2937',
    900: '#111827',
    950: '#030712',
  },
  
  // Accent colors for batches
  accent1: {
    bg: '#f0fdfa', // teal-50
    border: '#99f6e4', // teal-200
    text: '#0f766e', // teal-700
  },
  accent2: {
    bg: '#f5f3ff', // purple-50
    border: '#ddd6fe', // purple-200
    text: '#6d28d9', // purple-700
  },
  accent3: {
    bg: '#fff7ed', // orange-50
    border: '#fed7aa', // orange-200
    text: '#c2410c', // orange-700
  },
  accent4: {
    bg: '#ecfeff', // cyan-50
    border: '#a5f3fc', // cyan-200
    text: '#0e7490', // cyan-700
  },
  accent5: {
    bg: '#f0fdf4', // green-50
    border: '#bbf7d0', // green-200
    text: '#15803d', // green-700
  },
};

// Card styles
export const cardStyles = {
  default: "bg-white border border-neutral-200 shadow-sm hover:shadow-md transition-all rounded-lg",
  selected: "bg-white border border-primary-300 shadow-md ring-1 ring-primary-300 rounded-lg",
  header: "border-b border-neutral-200 p-4",
  content: "p-4",
};

// Badge styles
export const badgeStyles = {
  outline: "bg-neutral-50 text-neutral-700 border border-neutral-200",
  primary: "bg-primary-50 text-primary-700 border border-primary-200",
  secondary: "bg-secondary-50 text-secondary-700 border border-secondary-200",
  success: "bg-success-50 text-success-700 border border-success-200",
  warning: "bg-warning-50 text-warning-700 border border-warning-200",
};

// Button styles
export const buttonStyles = {
  primary: "bg-primary-600 hover:bg-primary-700 text-white shadow-sm",
  secondary: "bg-secondary-600 hover:bg-secondary-700 text-white shadow-sm",
  success: "bg-success-600 hover:bg-success-700 text-white shadow-sm",
  warning: "bg-warning-600 hover:bg-warning-700 text-white shadow-sm",
  neutral: "bg-neutral-800 hover:bg-neutral-700 text-white shadow-sm",
  outline: "bg-white border border-neutral-300 text-neutral-700 hover:bg-neutral-50 shadow-sm",
}; 