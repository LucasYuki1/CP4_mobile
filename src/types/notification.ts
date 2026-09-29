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

export type NotificationSettings = {
  conversationId: string;
  policy: NotificationPolicy;
  updatedBy: string;
  updatedAt: number;
};

/** Canal de entrega do token: FCM direto (Android) ou Expo Push Service (iOS/APNs). */
export type PushProvider = 'fcm' | 'expo';

export type DevicePlatform = 'android' | 'ios';

/** Documento users/{uid}/devices/{deviceId}. */
export type DeviceRegistration = {
  token: string;
  provider: PushProvider;
  platform: DevicePlatform;
  enabled: boolean;
  updatedAt: number;
};

/** Dados que acompanham o push e permitem abrir a conversa ao tocar. */
export type NotificationPayload = {
  conversationId: string;
  conversationType: 'direct' | 'group';
};

export type NotificationPermissionState = 'granted' | 'denied' | 'undetermined' | 'unsupported';
