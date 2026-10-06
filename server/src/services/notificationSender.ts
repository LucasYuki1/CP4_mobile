import { adminFirestore, adminMessaging } from './firebaseAdmin';
import type { DeviceRecord, PushProvider } from '../types';

export type PushContent = {
  title: string;
  body: string;
  data: { conversationId: string; conversationType: string; messageId: string };
};

export type SendSummary = { delivered: number; failed: number; invalidated: number };

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
const INVALID_FCM_CODES = new Set([
  'messaging/registration-token-not-registered',
  'messaging/invalid-registration-token',
]);

function isProvider(value: unknown): value is PushProvider {
  return value === 'fcm' || value === 'expo';
}

/** Tokens ativos dos destinatarios, lidos de users/{uid}/devices. */
export async function loadDevices(uids: readonly string[]): Promise<DeviceRecord[]> {
  const perUser = await Promise.all(
    uids.map(async (uid) => {
      const snapshot = await adminFirestore
        .collection('users')
        .doc(uid)
        .collection('devices')
        .where('enabled', '==', true)
        .get();
      return snapshot.docs.flatMap((item): DeviceRecord[] => {
        const token: unknown = item.get('token');
        const provider: unknown = item.get('provider');
        return typeof token === 'string' && token.length > 0 && isProvider(provider)
          ? [{ uid, deviceId: item.id, token, provider }]
          : [];
      });
    }),
  );
  return perUser.flat();
}

/** Token recusado pelo provedor: o dispositivo e desativado e nao recebe mais tentativas. */
async function disableDevices(devices: readonly DeviceRecord[]): Promise<void> {
  await Promise.all(
    devices.map((device) =>
      adminFirestore
        .collection('users')
        .doc(device.uid)
        .collection('devices')
        .doc(device.deviceId)
        .update({ enabled: false, invalidatedAt: Date.now() })
        .catch(() => undefined),
    ),
  );
}

async function sendViaFcm(devices: readonly DeviceRecord[], content: PushContent): Promise<SendSummary> {
  if (devices.length === 0) return { delivered: 0, failed: 0, invalidated: 0 };
  const response = await adminMessaging.sendEachForMulticast({
    tokens: devices.map((device) => device.token),
    notification: { title: content.title, body: content.body },
    data: content.data,
    android: {
      priority: 'high',
      notification: { channelId: 'messages', sound: 'default' },
    },
  });
  const invalid: DeviceRecord[] = [];
  response.responses.forEach((result, index) => {
    const device = devices[index];
    if (!result.success && device && result.error && INVALID_FCM_CODES.has(result.error.code)) {
      invalid.push(device);
    }
  });
  await disableDevices(invalid);
  return { delivered: response.successCount, failed: response.failureCount, invalidated: invalid.length };
}

type ExpoTicket = { status?: unknown; details?: { error?: unknown } };

async function sendViaExpo(devices: readonly DeviceRecord[], content: PushContent): Promise<SendSummary> {
  if (devices.length === 0) return { delivered: 0, failed: 0, invalidated: 0 };
  const response = await fetch(EXPO_PUSH_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(
      devices.map((device) => ({
        to: device.token,
        title: content.title,
        body: content.body,
        data: content.data,
        sound: 'default',
        channelId: 'messages',
        priority: 'high',
      })),
    ),
  });
  if (!response.ok) return { delivered: 0, failed: devices.length, invalidated: 0 };
  const body = (await response.json()) as { data?: unknown };
  const tickets: ExpoTicket[] = Array.isArray(body.data) ? (body.data as ExpoTicket[]) : [];
  const invalid: DeviceRecord[] = [];
  let delivered = 0;
  tickets.forEach((ticket, index) => {
    const device = devices[index];
    if (ticket.status === 'ok') delivered += 1;
    else if (device && ticket.details?.error === 'DeviceNotRegistered') invalid.push(device);
  });
  await disableDevices(invalid);
  return { delivered, failed: devices.length - delivered, invalidated: invalid.length };
}

/**
 * Android recebe pelo FCM (Admin SDK). iOS recebe pelo Expo Push Service,
 * que entrega via APNs. Os dois caminhos usam o mesmo conteudo e payload.
 */
export async function sendPush(devices: readonly DeviceRecord[], content: PushContent): Promise<SendSummary> {
  const [fcm, expo] = await Promise.all([
    sendViaFcm(devices.filter((device) => device.provider === 'fcm'), content),
    sendViaExpo(devices.filter((device) => device.provider === 'expo'), content),
  ]);
  return {
    delivered: fcm.delivered + expo.delivered,
    failed: fcm.failed + expo.failed,
    invalidated: fcm.invalidated + expo.invalidated,
  };
}
