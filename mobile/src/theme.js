// ─────────────────────────────────────────────────────────────────────────────
// Design Tokens — Premium dark theme for RoadWatch
// ─────────────────────────────────────────────────────────────────────────────
export const COLORS = {
  // Backgrounds
  bg:           '#030712',
  bgCard:       '#111827',
  surface:      '#1F2937',
  surfaceHigh:  '#374151',
  // Brand
  primary:      '#8B5CF6',
  primaryLight: '#A78BFA',
  primaryDark:  '#6D28D9',
  primaryGlow:  'rgba(139,92,246,0.18)',
  // Status
  success:      '#10B981',
  successGlow:  'rgba(16,185,129,0.15)',
  warning:      '#F59E0B',
  warningGlow:  'rgba(245,158,11,0.15)',
  danger:       '#EF4444',
  dangerGlow:   'rgba(239,68,68,0.15)',
  // Text
  text:         '#F9FAFB',
  textSub:      '#D1D5DB',
  textMuted:    '#6B7280',
  // Borders
  border:       '#1F2937',
  borderLight:  '#374151',
  // Misc
  overlay:      'rgba(3,7,18,0.85)',
};

export const STATUS_COLORS = {
  red:    { bg: 'rgba(239,68,68,0.12)', text: '#EF4444',  border: 'rgba(239,68,68,0.3)',  label: 'Unassigned', bar: '#EF4444'  },
  orange: { bg: 'rgba(245,158,11,0.12)',  text: '#F59E0B',  border: 'rgba(245,158,11,0.3)',   label: 'Assigned',   bar: '#F59E0B'  },
  green:  { bg: 'rgba(16,185,129,0.12)',  text: '#10B981',  border: 'rgba(16,185,129,0.3)',   label: 'Completed',  bar: '#10B981'  },
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
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
  },
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
  },
};
