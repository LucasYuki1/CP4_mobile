import type { AuthProvider, ChatUser, MarketRole } from '../types/user';

/**
 * Regra do marketplace.
 *
 * O provedor de autenticacao define o papel:
 *   e-mail/senha -> vendedor (conta cadastrada na plataforma)
 *   Google/Apple -> comprador (login social, sem cadastro)
 *
 * Uma negociacao so existe entre lados opostos do balcao. Isso satisfaz,
 * por consequencia, as combinacoes exigidas no enunciado:
 *   password <-> google    permitido
 *   password <-> apple     permitido
 *   password <-> password  bloqueado (vendedor com vendedor)
 *   google   <-> apple     bloqueado (comprador com comprador)
 *   google   <-> google    bloqueado
 *   apple    <-> apple     bloqueado
 */
export function roleOf(provider: AuthProvider): MarketRole {
  return provider === 'password' ? 'seller' : 'buyer';
}

export function canNegotiate(current: ChatUser, other: ChatUser): boolean {
  if (current.uid === other.uid) return false;
  return roleOf(current.provider) !== roleOf(other.provider);
}

/**
 * Id deterministico: os dois uid ordenados e unidos por '_'.
 *
 * Consequencias:
 *  - criar a conversa e idempotente (os dois lados chegam no mesmo no);
 *  - e impossivel existir conversa com tres pessoas: o id so comporta dois uid;
 *  - as Security Rules validam o participante contra o proprio id.
 *
 * Uid do Firebase Auth sao alfanumericos, entao '_' e um separador seguro.
 */
export function buildConversationId(uidA: string, uidB: string): string {
  if (uidA === uidB) {
    throw new Error('Uma conversa exige dois participantes distintos.');
  }
  return [uidA, uidB].sort().join('_');
}

export function participantsOf(conversationId: string): [string, string] {
  const parts = conversationId.split('_');
  const [first, second] = parts;
  if (parts.length !== 2 || !first || !second) {
    throw new Error(`Id de conversa invalido: ${conversationId}`);
  }
  return [first, second];
}

export const PROVIDER_LABEL: Record<AuthProvider, string> = {
  password: 'E-mail e senha',
  google: 'Google',
  apple: 'Apple',
};

export const ROLE_LABEL: Record<MarketRole, string> = {
  seller: 'Vendedor',
  buyer: 'Comprador',
};

export const ROLE_HINT: Record<MarketRole, string> = {
  seller: 'Anuncia e responde propostas',
  buyer: 'Negocia e faz propostas',
};
