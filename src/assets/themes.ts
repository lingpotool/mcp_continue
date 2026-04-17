export interface ThemeColors {
  bgPrimary: string;
  bgSecondary: string;
  bgTertiary: string;
  bgHover: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  accent: string;
  accentHover: string;
  accentLight: string;
  danger: string;
  dangerHover: string;
  border: string;
  borderLight: string;
  shadow: string;
  embossLight: string;
  embossDark: string;
  success: string;
  warning: string;
}

export interface Theme {
  name: string;
  label: string;
  colors: ThemeColors;
}

const darkTheme: Theme = {
  name: 'dark',
  label: '深色',
  colors: {
    bgPrimary: '#13141f',
    bgSecondary: '#1c1d2e',
    bgTertiary: '#252640',
    bgHover: '#2a2b45',
    textPrimary: '#e4e4f0',
    textSecondary: '#a0a0b8',
    textMuted: '#6b6b82',
    accent: '#7c6cf0',
    accentHover: '#9488f4',
    accentLight: 'rgba(124,108,240,0.15)',
    danger: '#ef5350',
    dangerHover: '#f7797a',
    border: '#2e2f48',
    borderLight: '#363754',
    shadow: 'rgba(0,0,0,0.4)',
    embossLight: 'rgba(255,255,255,0.04)',
    embossDark: 'rgba(0,0,0,0.3)',
    success: '#4caf50',
    warning: '#ff9800',
  },
};

const lightTheme: Theme = {
  name: 'light',
  label: '浅色',
  colors: {
    bgPrimary: '#f4f4f8',
    bgSecondary: '#ffffff',
    bgTertiary: '#eeeef4',
    bgHover: '#e8e8f0',
    textPrimary: '#1a1a2e',
    textSecondary: '#555570',
    textMuted: '#8888a0',
    accent: '#6c5ce7',
    accentHover: '#5a4bd6',
    accentLight: 'rgba(108,92,231,0.1)',
    danger: '#e53935',
    dangerHover: '#c62828',
    border: '#d8d8e4',
    borderLight: '#e4e4ee',
    shadow: 'rgba(0,0,0,0.08)',
    embossLight: 'rgba(255,255,255,0.9)',
    embossDark: 'rgba(0,0,0,0.06)',
    success: '#43a047',
    warning: '#f57c00',
  },
};

export const themes: Record<string, Theme> = { dark: darkTheme, light: lightTheme };

export function getTheme(name: string): Theme {
  return themes[name] || darkTheme;
}

export function generateCSSVariables(theme: Theme): string {
  const c = theme.colors;
  return `
    --bg-primary: ${c.bgPrimary};
    --bg-secondary: ${c.bgSecondary};
    --bg-tertiary: ${c.bgTertiary};
    --bg-hover: ${c.bgHover};
    --text-primary: ${c.textPrimary};
    --text-secondary: ${c.textSecondary};
    --text-muted: ${c.textMuted};
    --accent: ${c.accent};
    --accent-hover: ${c.accentHover};
    --accent-light: ${c.accentLight};
    --danger: ${c.danger};
    --danger-hover: ${c.dangerHover};
    --border: ${c.border};
    --border-light: ${c.borderLight};
    --shadow: ${c.shadow};
    --emboss-light: ${c.embossLight};
    --emboss-dark: ${c.embossDark};
    --success: ${c.success};
    --warning: ${c.warning};
  `;
}
