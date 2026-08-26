import {
  get,
  limitToLast,
  onChildAdded,
  onChildChanged,
  orderByChild,
  push,
  query,
  ref,
  serverTimestamp,
  set,
  type DataSnapshot,
} from 'firebase/database';

import { database } from './firebase';
import { buildConversationId, participantsOf } from '../utils/chatRules';
import type {
  ChatMessage,
  Conversation,
  ConversationRecord,
  MessageDraft,
  MessageRecord,
} from '../types/chat';

const CONVERSATIONS_PATH = 'conversations';
const MESSAGES_PATH = 'messages';
const MESSAGE_PAGE_SIZE = 200;

/**
 * Cria a conversa se ela ainda nao existir. Como o id e deterministico,
 * os dois participantes convergem para o mesmo no e a operacao e idempotente:
 * nao ha risco de duplicar conversa se ambos abrirem o chat ao mesmo tempo.
 */
export async function ensureConversation(
  currentUid: string,
  otherUid: string,
): Promise<Conversation> {
  const id = buildConversationId(currentUid, otherUid);
  const conversationRef = ref(database, `${CONVERSATIONS_PATH}/${id}`);
  const snapshot = await get(conversationRef);

  if (snapshot.exists()) {
    const raw = snapshot.val() as Partial<ConversationRecord>;
    return {
      id,
      participants: participantsOf(id),
      createdAt: typeof raw.createdAt === 'number' ? raw.createdAt : Date.now(),
    };
  }

  const createdAt = Date.now();
  const record: ConversationRecord = {
    participants: { [currentUid]: true, [otherUid]: true },
    createdAt,
  };
  await set(conversationRef, record);

  return { id, participants: participantsOf(id), createdAt };
}

function toChatMessage(conversationId: string, snapshot: DataSnapshot): ChatMessage | null {
  const raw: unknown = snapshot.val();
  if (typeof raw !== 'object' || raw === null || !snapshot.key) return null;
  const record = raw as Partial<MessageRecord>;
  if (
    typeof record.senderId !== 'string' ||
    typeof record.receiverId !== 'string' ||
    typeof record.text !== 'string'
  ) {
    return null;
  }
  return {
    id: snapshot.key,
    conversationId,
    senderId: record.senderId,
    receiverId: record.receiverId,
    text: record.text,
    // createdAt chega null no eco local antes do servidor resolver o timestamp.
    createdAt: typeof record.createdAt === 'number' ? record.createdAt : Date.now(),
  };
}

export type MessageListeners = {
  onMessageAdded: (message: ChatMessage) => void;
  onMessageChanged: (message: ChatMessage) => void;
  onError: (error: Error) => void;
};

/**
 * Escuta em tempo real as mensagens da conversa.
 *
 * Usamos onChildAdded para o fluxo incremental (mensagem nova chega e e
 * acrescentada a lista) e onChildChanged porque serverTimestamp() dispara um
 * segundo evento quando o servidor substitui a estimativa local pelo horario
 * definitivo. Retorna a funcao de limpeza que remove os dois listeners.
 */
export function listenToMessages(
  conversationId: string,
  listeners: MessageListeners,
): () => void {
  const messagesQuery = query(
    ref(database, `${MESSAGES_PATH}/${conversationId}`),
    orderByChild('createdAt'),
    limitToLast(MESSAGE_PAGE_SIZE),
  );

  const unsubscribeAdded = onChildAdded(
    messagesQuery,
    (snapshot) => {
      const message = toChatMessage(conversationId, snapshot);
      if (message) listeners.onMessageAdded(message);
    },
    (error) => listeners.onError(error),
  );

  const unsubscribeChanged = onChildChanged(
    messagesQuery,
    (snapshot) => {
      const message = toChatMessage(conversationId, snapshot);
      if (message) listeners.onMessageChanged(message);
    },
    (error) => listeners.onError(error),
  );

  return () => {
    unsubscribeAdded();
    unsubscribeChanged();
  };
}

export async function sendMessage(draft: MessageDraft): Promise<string> {
  const text = draft.text.trim();
  if (text.length === 0) {
    throw new Error('A mensagem nao pode ser vazia.');
  }

  const messagesRef = ref(database, `${MESSAGES_PATH}/${draft.conversationId}`);
  const messageRef = push(messagesRef);
  if (!messageRef.key) {
    throw new Error('Nao foi possivel gerar o identificador da mensagem.');
  }

  await set(messageRef, {
    senderId: draft.senderId,
    receiverId: draft.receiverId,
    text,
    createdAt: serverTimestamp(),
  });

  return messageRef.key;
}
