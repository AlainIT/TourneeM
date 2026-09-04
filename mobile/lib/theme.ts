// Palette TourneeM — sobre, orientée terrain, lisible en extérieur.
export const colors = {
  // Interface
  background: '#F4F6F7',
  surface: '#FFFFFF',
  primary: '#0B3D42', // bleu pétrole foncé
  primaryLight: '#155E63',
  border: '#DDE3E5',
  textPrimary: '#12262A',
  textSecondary: '#5C6E72',
  textInverse: '#FFFFFF',

  // Ciblage (sémantique, cohérente sur carte/liste/filtres)
  p1: '#DC3545', // rouge — priorité 1
  p2: '#F0883E', // orange — priorité 2
  p3: '#2E86DE', // bleu — priorité 3
  hc: '#9AA5B1', // gris — hors cible

  success: '#2E9E5B',
  danger: '#DC3545',
  warning: '#F0883E',
} as const;

export const ciblageColor: Record<'P1' | 'P2' | 'P3' | 'HC', string> = {
  P1: colors.p1,
  P2: colors.p2,
  P3: colors.p3,
  HC: colors.hc,
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

export const radius = {
  sm: 6,
  md: 12,
  lg: 20,
  pill: 999,
} as const;
