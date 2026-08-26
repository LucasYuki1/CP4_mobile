/**
 * Identidade visual: "balcao".
 * A cor nao decora, ela codifica o papel. Vendedor sempre jade,
 * comprador sempre cobalto, em toda a aplicacao: etiqueta do contato,
 * cabecalho do chat e balao da mensagem. Assim a regra de negocio
 * fica visivel na tela, e nao apenas no codigo.
 */
export const colors = {
  canvas: '#ECEEE8',
  surface: '#FFFFFF',
  ink: '#16181A',
  muted: '#6C7167',
  hairline: '#D6DAD2',
  seller: '#2F6B4F',
  sellerSoft: '#E2EDE7',
  buyer: '#2A4FB8',
  buyerSoft: '#E1E7F6',
  danger: '#A3341F',
  dangerSoft: '#F6E4E0',
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

export const roleColor = {
  seller: { strong: colors.seller, soft: colors.sellerSoft },
  buyer: { strong: colors.buyer, soft: colors.buyerSoft },
} as const;
