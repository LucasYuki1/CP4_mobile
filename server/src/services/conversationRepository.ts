import { adminDatabase, adminFirestore } from './firebaseAdmin';
import {
  NOTIFICATION_POLICIES,
  type ConversationType,
  type MessageTarget,
  type NotificationPolicy,
  type StoredMessage,
} from '../types';

/** Ids do RTDB e do Firestore nao podem conter estes caracteres. */
export function isSafeId(value: unknown): value is string {
  return typeof value === 'string' && /^[A-Za-z0-9_-]{1,128}$/.test(value);
}

export function conversationTypeOf(conversationId: string): ConversationType {
  return conversationId.includes('_') ? 'direct' : 'group';
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

export async function readMessage(conversationId: string, messageId: string): Promise<StoredMessage | null> {
  const snapshot = await adminDatabase.ref(`messages/${conversationId}/${messageId}`).get();
  const raw: unknown = snapshot.val();
  if (typeof raw !== 'object' || raw === null) return null;
  const data = raw as Record<string, unknown>;
  if (
    typeof data.senderId !== 'string' ||
    typeof data.text !== 'string' ||
    (data.conversationType !== 'direct' && data.conversationType !== 'group')
  ) {
    return null;
  }
  const mentions = data.mentionedUserIds;
  return {
    conversationType: data.conversationType,
    senderId: data.senderId,
    text: data.text,
    target: readTarget(data.target),
    mentionedUserIds: typeof mentions === 'object' && mentions !== null ? Object.keys(mentions) : [],
    createdAt: typeof data.createdAt === 'number' ? data.createdAt : 0,
  };
}

export type ConversationContext = {
  type: ConversationType;
  participantIds: string[];
  policy: NotificationPolicy;
  /** Nome exibido no titulo do push de grupo. */
  groupName: string | null;
};

function isPolicy(value: unknown): value is NotificationPolicy {
  return typeof value === 'string' && (NOTIFICATION_POLICIES as readonly string[]).includes(value);
}

function readStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

/** Participantes e politica, sempre lidos do Firestore, nunca do cliente. */
export async function readConversation(conversationId: string): Promise<ConversationContext | null> {
  if (conversationTypeOf(conversationId) === 'direct') {
    const snapshot = await adminFirestore.collection('directConversations').doc(conversationId).get();
    if (!snapshot.exists) return null;
    const participantIds = readStringArray(snapshot.get('participantIds'));
    if (participantIds.length !== 2) return null;
    return { type: 'direct', participantIds, policy: 'all_group_messages', groupName: null };
  }
  const snapshot = await adminFirestore.collection('groups').doc(conversationId).get();
  if (!snapshot.exists) return null;
  const policy: unknown = snapshot.get('notificationPolicy');
  const name: unknown = snapshot.get('name');
  return {
    type: 'group',
    participantIds: readStringArray(snapshot.get('memberIds')),
    policy: isPolicy(policy) ? policy : 'disabled',
    groupName: typeof name === 'string' ? name : 'Grupo',
  };
}

export async function readUserName(uid: string): Promise<string> {
  const snapshot = await adminFirestore.collection('publicProfiles').doc(uid).get();
  const name: unknown = snapshot.get('name');
  return typeof name === 'string' && name.length > 0 ? name : 'Alguem';
}
