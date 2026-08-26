/** Modelo de dominio da conversa: exatamente dois participantes. */
export type Conversation = {
  id: string;
  participants: [string, string];
  createdAt: number;
};

/**
 * Formato gravado em /conversations/$conversationId.
 * Mapa (e nao array) porque as Security Rules do Realtime Database
 * consultam participantes por chave: participants/$uid.
 */
export type ConversationRecord = {
  participants: Record<string, true>;
  createdAt: number;
};

export type ChatMessage = {
  id: string;
  conversationId: string;
  senderId: string;
  receiverId: string;
  text: string;
  createdAt: number;
};

/** Formato gravado em /messages/$conversationId/$messageId. */
export type MessageRecord = {
  senderId: string;
  receiverId: string;
  text: string;
  createdAt: number;
};

export type MessageDraft = {
  conversationId: string;
  senderId: string;
  receiverId: string;
  text: string;
};
