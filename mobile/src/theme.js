// ─────────────────────────────────────────────────────────────────────────────
// Design Tokens — Clean light theme for StreetIntel
// ─────────────────────────────────────────────────────────────────────────────
export const COLORS = {
  // Backgrounds
  bg:           '#F8FAFC',
  bgCard:       '#FFFFFF',
  surface:      '#F1F5F9',
  surfaceHigh:  '#E2E8F0',
  // Brand
  primary:      '#7C3AED',
  primaryLight: '#8B5CF6',
  primaryDark:  '#6D28D9',
  primaryGlow:  'rgba(124,58,237,0.10)',
  // Status
  success:      '#059669',
  successGlow:  'rgba(5,150,105,0.10)',
  warning:      '#D97706',
  warningGlow:  'rgba(217,119,6,0.10)',
  danger:       '#DC2626',
  dangerGlow:   'rgba(220,38,38,0.10)',
  // Text
  text:         '#0F172A',
  textSub:      '#475569',
  textMuted:    '#94A3B8',
  // Borders
  border:       '#E2E8F0',
  borderLight:  '#CBD5E1',
  // Misc
  overlay:      'rgba(15,23,42,0.6)',
};

export const STATUS_COLORS = {
  red:    { bg: 'rgba(220,38,38,0.08)',  text: '#DC2626', border: 'rgba(220,38,38,0.25)',  label: 'Unassigned', bar: '#DC2626' },
  orange: { bg: 'rgba(217,119,6,0.08)',  text: '#D97706', border: 'rgba(217,119,6,0.25)',  label: 'Assigned',   bar: '#D97706' },
  green:  { bg: 'rgba(5,150,105,0.08)',  text: '#059669', border: 'rgba(5,150,105,0.25)',  label: 'Completed',  bar: '#059669' },
};

export const FONTS = {
  xs:   11,
  sm:   13,
  md:   15,
  lg:   18,
  xl:   22,
  xxl:  28,
  xxxl: 34,
};

export const SPACING = {
  xs:  4,
  sm:  8,
  md:  12,
  lg:  18,
  xl:  24,
  xxl: 36,
  xxxl:52,
};

export const RADIUS = {
  sm:  8,
  md:  14,
  lg:  20,
  xl:  28,
  full: 999,
};

export const SHADOWS = {
  primary: {
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 12,
    elevation: 6,
  },
  card: {
    shadowColor: '#94A3B8',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 3,
  },
};
