import { useColorScheme } from 'react-native';

const light = {
  primary: '#612D53',
  primaryHover: '#853953',
  bg: '#F3F4F4',
  surface: '#ffffff',
  text: '#2C2C2C',
  textMuted: '#9ca3af',
  border: '#e5e7eb',
};

const dark = {
  primary: '#853953',
  primaryHover: '#a04868',
  bg: '#1a1a1a',
  surface: '#242424',
  text: '#F3F4F4',
  textMuted: '#6b7280',
  border: '#2e2e2e',
};

export type Theme = typeof light;

export function useTheme(): Theme {
  const scheme = useColorScheme();
  return scheme === 'dark' ? dark : light;
}
