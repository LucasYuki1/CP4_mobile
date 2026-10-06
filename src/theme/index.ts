/**
 * Identidade visual. A cor codifica o tipo de conversa: individual em jade,
 * grupo em cobalto, na lista, no cabecalho do chat e nos baloes.
 */
export const colors = {
  canvas: '#ECEEE8',
  surface: '#FFFFFF',
  ink: '#16181A',
  muted: '#6C7167',
  hairline: '#D6DAD2',
  direct: '#2F6B4F',
  directSoft: '#E2EDE7',
  group: '#2A4FB8',
  groupSoft: '#E1E7F6',
  mine: '#16181A',
  mineText: '#FFFFFF',
  danger: '#A3341F',
  dangerSoft: '#F6E4E0',
  warning: '#8A5A00',
  warningSoft: '#FBF0D9',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radius = {
  sm: 8,
  md: 14,
  lg: 20,
  pill: 999,
} as const;

/** Micro-rotulo em caixa alta com tracking largo: assinatura tipografica do app. */
export const typography = {
  eyebrow: {
    fontSize: 11,
    fontWeight: '700' as const,
    letterSpacing: 1.4,
    textTransform: 'uppercase' as const,
  },
  title: { fontSize: 26, fontWeight: '700' as const, letterSpacing: -0.6 },
  subtitle: { fontSize: 17, fontWeight: '600' as const },
  body: { fontSize: 15, fontWeight: '400' as const },
  caption: { fontSize: 13, fontWeight: '400' as const },
} as const;

export const kindColor = {
  direct: { strong: colors.direct, soft: colors.directSoft },
  group: { strong: colors.group, soft: colors.groupSoft },
} as const;
