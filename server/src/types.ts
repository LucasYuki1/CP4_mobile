export type ConversationType = 'direct' | 'group';

export type NotificationPolicy =
  | 'all_group_messages'
  | 'mentioned_members'
  | 'direct_messages_only'
  | 'disabled';

export const NOTIFICATION_POLICIES: readonly NotificationPolicy[] = [
  'all_group_messages',
  'mentioned_members',
  'direct_messages_only',
  'disabled',
];

export type MessageTarget = { type: 'conversation' } | { type: 'member'; memberId: string };

/** Mensagem como esta gravada em messages/{conversationId}/{messageId}. */
export type StoredMessage = {
  conversationType: ConversationType;
  senderId: string;
  text: string;
  target: MessageTarget;
  mentionedUserIds: string[];
  createdAt: number;
};

export type PushProvider = 'fcm' | 'expo';

export type DeviceRecord = {
  uid: string;
  deviceId: string;
  token: string;
  provider: PushProvider;
};

/** Variaveis que o middleware de autenticacao deixa em res.locals. */
export type AuthLocals = { uid: string };
