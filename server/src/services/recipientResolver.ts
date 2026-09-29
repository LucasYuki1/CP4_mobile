import type { ConversationType, NotificationPolicy, StoredMessage } from '../types';

export type ResolveInput = {
  conversationType: ConversationType;
  /** Participantes atuais, lidos do Firestore pelo servidor. */
  participantIds: readonly string[];
  /** Politica do grupo. Ignorada em conversa individual. */
  policy: NotificationPolicy;
  message: Pick<StoredMessage, 'senderId' | 'target' | 'mentionedUserIds'>;
};

/**
 * Calcula quem recebe o push. Funcao pura: toda a regra de negocio das
 * politicas fica aqui e e coberta por testes.
 *
 * Regras gerais, validas para qualquer politica:
 *  - o remetente nunca recebe o proprio push;
 *  - so participantes atuais da conversa podem receber (mencoes a quem ja
 *    saiu do grupo sao descartadas).
 */
export function resolveRecipients({ conversationType, participantIds, policy, message }: ResolveInput): string[] {
  const participants = new Set(participantIds);
  const eligible = (uid: string): boolean => uid !== message.senderId && participants.has(uid);

  if (conversationType === 'direct') {
    return participantIds.filter(eligible);
  }

  switch (policy) {
    case 'all_group_messages':
      return participantIds.filter(eligible);
    case 'mentioned_members': {
      const targeted = new Set(message.mentionedUserIds);
      if (message.target.type === 'member') targeted.add(message.target.memberId);
      return Array.from(targeted).filter(eligible);
    }
    case 'direct_messages_only':
    case 'disabled':
      return [];
  }
}
