import {
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
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  query as firestoreQuery,
  setDoc,
  where,
} from 'firebase/firestore';

import { callApi } from './apiClient';
import { database, firestore } from './firebase';
import { buildDirectConversationId, participantsOf } from '../utils/conversationId';
import { AppError } from '../utils/errors';
import type {
  ChatMessage,
  ConversationType,
  DirectConversation,
  DirectConversationDocument,
  MessageDraft,
  MessageRecord,
  MessageTarget,
} from '../types/chat';

const DIRECT_CONVERSATIONS = 'directConversations';
const MESSAGES_PATH = 'messages';
const MESSAGE_PAGE_SIZE = 200;
export const MAX_MESSAGE_LENGTH = 1000;

/**
 * Cria a conversa individual se ela ainda nao existir. O id deterministico
 * torna a operacao idempotente: os dois lados convergem para o mesmo documento.
 */
export async function ensureDirectConversation(
  currentUid: string,
  otherUid: string,
): Promise<DirectConversation> {
  const id = buildDirectConversationId(currentUid, otherUid);
  const conversationRef = doc(firestore, DIRECT_CONVERSATIONS, id);
  const snapshot = await getDoc(conversationRef);

  if (snapshot.exists()) {
    const raw = snapshot.data() as Partial<DirectConversationDocument>;
    return {
      id,
      type: 'direct',
      participants: participantsOf(id),
      createdAt: typeof raw.createdAt === 'number' ? raw.createdAt : 0,
    };
  }

  const record: DirectConversationDocument = {
    participantIds: participantsOf(id),
    createdAt: Date.now(),
  };
  await setDoc(conversationRef, record);
  return { id, type: 'direct', participants: record.participantIds, createdAt: record.createdAt };
}

/** Escuta as conversas individuais do usuario (Firestore). */
export function listenToDirectConversations(
  uid: string,
  onConversations: (conversations: DirectConversation[]) => void,
  onError: (error: Error) => void,
): () => void {
  const conversationsQuery = firestoreQuery(
    collection(firestore, DIRECT_CONVERSATIONS),
    where('participantIds', 'array-contains', uid),
  );
  return onSnapshot(
    conversationsQuery,
    (snapshot) => {
      const conversations = snapshot.docs.map((item): DirectConversation => {
        const raw = item.data() as Partial<DirectConversationDocument>;
        return {
          id: item.id,
          type: 'direct',
          participants: participantsOf(item.id),
          createdAt: typeof raw.createdAt === 'number' ? raw.createdAt : 0,
        };
      });
      onConversations(conversations);
    },
    (error) => onError(error),
  );
}

function readTarget(raw: unknown): MessageTarget {
  if (typeof raw === 'object' && raw !== null) {
    const target = raw as { type?: unknown; memberId?: unknown };
    if (target.type === 'member' && typeof target.memberId === 'string') {
      return { type: 'member', memberId: target.memberId };
    }
  }
  return { type: 'conversation' };
}

function readMentions(raw: unknown): string[] {
  if (typeof raw !== 'object' || raw === null) return [];
  return Object.keys(raw);
}

function isConversationType(value: unknown): value is ConversationType {
  return value === 'direct' || value === 'group';
}

function toChatMessage(conversationId: string, snapshot: DataSnapshot): ChatMessage | null {
  const raw: unknown = snapshot.val();
  if (typeof raw !== 'object' || raw === null || !snapshot.key) return null;
  const record = raw as Partial<Record<keyof MessageRecord, unknown>>;
  if (
    typeof record.senderId !== 'string' ||
    typeof record.text !== 'string' ||
    !isConversationType(record.conversationType)
  ) {
    return null;
  }
  return {
    id: snapshot.key,
    conversationId,
    conversationType: record.conversationType,
    senderId: record.senderId,
    text: record.text,
    target: readTarget(record.target),
    mentionedUserIds: readMentions(record.mentionedUserIds),
    // createdAt chega como estimativa local antes do servidor resolver o timestamp.
    createdAt: typeof record.createdAt === 'number' ? record.createdAt : Date.now(),
  };
}

export type MessageListeners = {
  onMessageAdded: (message: ChatMessage) => void;
  onMessageChanged: (message: ChatMessage) => void;
  onError: (error: Error) => void;
};

/**
 * Escuta em tempo real as mensagens da conversa no Realtime Database.
 * onChildAdded entrega cada mensagem nova; onChildChanged cobre a troca da
 * estimativa local de serverTimestamp() pelo horario definitivo do servidor.
 * Retorna a funcao que remove os dois listeners.
 */
export function listenToMessages(conversationId: string, listeners: MessageListeners): () => void {
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

/** Persiste a mensagem no Realtime Database e devolve o id gerado. */
export async function sendMessage(draft: MessageDraft): Promise<string> {
  const text = draft.text.trim();
  if (text.length === 0) throw new AppError('A mensagem nao pode ser vazia.');
  if (text.length > MAX_MESSAGE_LENGTH) {
    throw new AppError(`A mensagem pode ter no maximo ${MAX_MESSAGE_LENGTH} caracteres.`);
  }

  const messageRef = push(ref(database, `${MESSAGES_PATH}/${draft.conversationId}`));
  if (!messageRef.key) throw new AppError('Nao foi possivel gerar o identificador da mensagem.');

  const mentions = Array.from(new Set(draft.mentionedUserIds)).filter(
    (uid) => uid !== draft.senderId,
  );
  const record: MessageRecord = {
    conversationType: draft.conversationType,
    senderId: draft.senderId,
    text,
    target: draft.target,
    createdAt: serverTimestamp(),
    ...(mentions.length > 0
      ? { mentionedUserIds: Object.fromEntries(mentions.map((uid): [string, true] => [uid, true])) }
      : {}),
  };
  await set(messageRef, record);
  return messageRef.key;
}

export type PushDispatchResult = {
  status: 'sent' | 'duplicate' | 'skipped';
  recipients: number;
};

/**
 * Pede a API que dispare o push da mensagem ja persistida. O app envia so os
 * ids: a API confere mensagem, remetente, participantes e politica no Firebase
 * e calcula os destinatarios no servidor.
 */
export function requestMessageNotification(
  conversationId: string,
  messageId: string,
): Promise<PushDispatchResult> {
  return callApi<PushDispatchResult>('/notifications/messages', {
    method: 'POST',
    body: { conversationId, messageId },
  });
}
