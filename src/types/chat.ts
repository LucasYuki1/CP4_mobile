export type ConversationType = 'direct' | 'group';

export type DirectConversation = {
  id: string;
  type: 'direct';
  participants: [string, string];
  createdAt: number;
};

/** Documento directConversations/{conversationId} no Firestore. */
export type DirectConversationDocument = {
  participantIds: [string, string];
  createdAt: number;
};

export type MessageTarget =
  | { type: 'conversation' }
  | { type: 'member'; memberId: string };

export type ChatMessage = {
  id: string;
  conversationId: string;
  conversationType: ConversationType;
  senderId: string;
  text: string;
  target: MessageTarget;
  mentionedUserIds: string[];
  createdAt: number;
};

/**
 * Formato gravado em Realtime Database: messages/{conversationId}/{messageId}.
 * O RTDB nao guarda arrays vazios, entao as mencoes sao um mapa uid -> true.
 */
export type MessageRecord = {
  conversationType: ConversationType;
  senderId: string;
  text: string;
  target: { type: 'conversation' } | { type: 'member'; memberId: string };
  mentionedUserIds?: Record<string, true>;
  createdAt: number | object;
};

export type MessageDraft = {
  conversationId: string;
  conversationType: ConversationType;
  senderId: string;
  text: string;
  target: MessageTarget;
  mentionedUserIds: string[];
};

/** Item da tela de Conversas: une conversas diretas e grupos. */
export type ConversationSummary =
  | {
      kind: 'direct';
      id: string;
      title: string;
      photoUrl: string;
      otherUid: string;
      createdAt: number;
    }
  | {
      kind: 'group';
      id: string;
      title: string;
      photoUrl: string;
      memberCount: number;
      memberLimit: number;
      createdAt: number;
    };
