import { Platform } from 'react-native';

export const COLORS = {
  bg: '#0a0a0c',
  surface: '#16161e',
  surfaceHover: '#21212a',
  border: '#24242e',
  borderActive: '#3e86f5',
  text: '#ffffff',
  textSecondary: '#a0a0ab',
  textMuted: '#686875',
  accent: '#3e86f5', // Samsung One UI Blue
  accentHover: '#2574f2',
  accentLight: '#3e86f51c',
  accentSolid: '#2574f2',
  online: '#2ec4b6',
  onlineLight: '#2ec4b61c',
  offline: '#ff5a5f',
  offlineLight: '#ff5a5f1c',
  warning: '#ff9f1c',
  warningLight: '#ff9f1c1c',
  info: '#00b4d8',
  infoLight: '#00b4d81c',
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
};

export const SIZES = {
  radiusSm: 8,
  radiusMd: 16, // Main card / button radius
  radiusLg: 24, // Widget / container radius
  radiusXl: 30, // Modals / bottom sheets
  radiusRound: 9999,
};

export const TYPOGRAPHY = {
  sizes: {
    xs: 11,
    sm: 13,
    md: 15,
    lg: 17,
    xl: 20,
    xxl: 26,
    title: 34,
  },
  weights: {
    light: '300',
    regular: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },
};

export const SHADOWS = {
  sm: Platform.select({
    web: { boxShadow: '0 2px 4px rgba(0,0,0,0.15)' },
    default: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1.5 },
      shadowOpacity: 0.15,
      shadowRadius: 2,
      elevation: 2,
    },
  }),
  md: Platform.select({
    web: { boxShadow: '0 4px 12px rgba(0,0,0,0.2)' },
    default: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.2,
      shadowRadius: 6,
      elevation: 5,
    },
  }),
  lg: Platform.select({
    web: { boxShadow: '0 8px 24px rgba(0,0,0,0.3)' },
    default: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.25,
      shadowRadius: 12,
      elevation: 8,
    },
  }),
};

export default {
  COLORS,
  SPACING,
  SIZES,
  TYPOGRAPHY,
  SHADOWS,
};
