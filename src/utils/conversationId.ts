/**
 * Id deterministico da conversa individual: os dois uid ordenados, unidos por '_'.
 *
 * - dois usuarios sempre chegam ao mesmo id, entao nao existem duas conversas
 *   diretas para o mesmo par;
 * - o id so comporta dois uid, entao a conversa tem exatamente dois participantes;
 * - as regras do Realtime Database validam o participante contra o proprio id.
 *
 * Uid do Firebase Auth e ids automaticos do Firestore sao alfanumericos, entao
 * '_' e um separador seguro e tambem distingue conversa direta de grupo.
 */
export function buildDirectConversationId(uidA: string, uidB: string): string {
  if (uidA === uidB) {
    throw new Error('Nao e possivel iniciar uma conversa consigo mesmo.');
  }
  return [uidA, uidB].sort().join('_');
}

export function isDirectConversationId(conversationId: string): boolean {
  return conversationId.includes('_');
}

export function participantsOf(conversationId: string): [string, string] {
  const parts = conversationId.split('_');
  const [first, second] = parts;
  if (parts.length !== 2 || !first || !second) {
    throw new Error(`Id de conversa invalido: ${conversationId}`);
  }
  return [first, second];
}

export function otherParticipant(conversationId: string, currentUid: string): string {
  const [first, second] = participantsOf(conversationId);
  return first === currentUid ? second : first;
}
