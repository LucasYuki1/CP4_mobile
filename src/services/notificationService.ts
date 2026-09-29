import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { doc, setDoc, updateDoc } from 'firebase/firestore';
import { Platform } from 'react-native';

import { firestore } from './firebase';
import { AppError } from '../utils/errors';
import type {
  DevicePlatform,
  DeviceRegistration,
  NotificationPayload,
  NotificationPermissionState,
  PushProvider,
} from '../types/notification';

const DEVICE_ID_KEY = 'chat.deviceId';
export const ANDROID_CHANNEL_ID = 'messages';

// Com o app aberto, o push tambem aparece como banner.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/** Id estavel por instalacao: um documento de dispositivo por aparelho. */
async function getDeviceId(): Promise<string> {
  const stored = await AsyncStorage.getItem(DEVICE_ID_KEY);
  if (stored) return stored;
  const generated = `${Platform.OS}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  await AsyncStorage.setItem(DEVICE_ID_KEY, generated);
  return generated;
}

function currentPlatform(): DevicePlatform | null {
  if (Platform.OS === 'android' || Platform.OS === 'ios') return Platform.OS;
  return null;
}

async function ensureAndroidChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
    name: 'Mensagens',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 200, 150, 200],
  });
}

export async function getPermissionState(): Promise<NotificationPermissionState> {
  if (!Device.isDevice) return 'unsupported';
  const settings = await Notifications.getPermissionsAsync();
  if (settings.granted) return 'granted';
  return settings.canAskAgain ? 'undetermined' : 'denied';
}

export async function requestPermission(): Promise<NotificationPermissionState> {
  if (!Device.isDevice) return 'unsupported';
  await ensureAndroidChannel();
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return 'granted';
  const asked = await Notifications.requestPermissionsAsync();
  if (asked.granted) return 'granted';
  return asked.canAskAgain ? 'undetermined' : 'denied';
}

type ObtainedToken = { token: string; provider: PushProvider };

/**
 * Android: token nativo do FCM, enviado pela API com o Firebase Admin SDK.
 * iOS: o token nativo e APNs, que o FCM Admin nao aceita sem o SDK nativo do
 * Firebase; usamos o Expo Push Token e a API envia pelo Expo Push Service.
 */
async function obtainToken(platform: DevicePlatform): Promise<ObtainedToken> {
  if (platform === 'android') {
    const native = await Notifications.getDevicePushTokenAsync();
    if (typeof native.data !== 'string' || native.data.length === 0) {
      throw new AppError('O aparelho nao forneceu um token de notificacao.', 'push/no-token');
    }
    return { token: native.data, provider: 'fcm' };
  }
  const projectId: unknown = Constants.expoConfig?.extra?.eas?.projectId;
  if (typeof projectId !== 'string') {
    throw new AppError('projectId do EAS ausente no app.json.', 'push/no-project');
  }
  const expoToken = await Notifications.getExpoPushTokenAsync({ projectId });
  return { token: expoToken.data, provider: 'expo' };
}

/** Grava (ou atualiza) o token em users/{uid}/devices/{deviceId}. */
export async function registerDevice(uid: string, token: ObtainedToken): Promise<void> {
  const platform = currentPlatform();
  if (!platform) return;
  const deviceId = await getDeviceId();
  const record: DeviceRegistration = {
    token: token.token,
    provider: token.provider,
    platform,
    enabled: true,
    updatedAt: Date.now(),
  };
  await setDoc(doc(firestore, 'users', uid, 'devices', deviceId), record);
}

export type RegistrationOutcome =
  | { status: 'registered' }
  | { status: 'permission-denied' }
  | { status: 'unsupported' }
  | { status: 'no-token'; message: string };

/** Pede permissao, obtem o token e registra o aparelho do usuario logado. */
export async function registerForPush(uid: string): Promise<RegistrationOutcome> {
  const platform = currentPlatform();
  if (!platform) return { status: 'unsupported' };
  const permission = await requestPermission();
  if (permission === 'unsupported') return { status: 'unsupported' };
  if (permission !== 'granted') return { status: 'permission-denied' };
  try {
    const token = await obtainToken(platform);
    await registerDevice(uid, token);
    return { status: 'registered' };
  } catch (error) {
    const message =
      error instanceof AppError ? error.message : 'Nao foi possivel obter o token deste aparelho.';
    return { status: 'no-token', message };
  }
}

/**
 * O FCM pode trocar o token a qualquer momento. O listener regrava o novo
 * valor para o mesmo deviceId. Retorna a funcao que remove o listener.
 */
export function listenToTokenRefresh(uid: string): () => void {
  const platform = currentPlatform();
  if (platform !== 'android') return () => undefined;
  const subscription = Notifications.addPushTokenListener((token) => {
    if (typeof token.data === 'string') {
      registerDevice(uid, { token: token.data, provider: 'fcm' }).catch(() => undefined);
    }
  });
  return () => subscription.remove();
}

/** No logout, o aparelho deixa de receber push do usuario anterior. */
export async function disableCurrentDevice(uid: string): Promise<void> {
  const deviceId = await AsyncStorage.getItem(DEVICE_ID_KEY);
  if (!deviceId) return;
  await updateDoc(doc(firestore, 'users', uid, 'devices', deviceId), {
    enabled: false,
    updatedAt: Date.now(),
  }).catch(() => undefined);
}

export function readPayload(data: unknown): NotificationPayload | null {
  if (typeof data !== 'object' || data === null) return null;
  const raw = data as { conversationId?: unknown; conversationType?: unknown };
  if (typeof raw.conversationId !== 'string' || raw.conversationId.length === 0) return null;
  if (raw.conversationType !== 'direct' && raw.conversationType !== 'group') return null;
  return { conversationId: raw.conversationId, conversationType: raw.conversationType };
}

/**
 * Toque na notificacao: cobre o app aberto/em segundo plano (listener) e o app
 * fechado (ultima resposta registrada ao abrir). Retorna a limpeza do listener.
 */
export function listenToNotificationTaps(onOpen: (payload: NotificationPayload) => void): () => void {
  const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
    const payload = readPayload(response.notification.request.content.data);
    if (payload) onOpen(payload);
  });

  Notifications.getLastNotificationResponseAsync()
    .then((response) => {
      if (!response) return;
      const payload = readPayload(response.notification.request.content.data);
      if (payload) onOpen(payload);
      Notifications.clearLastNotificationResponseAsync().catch(() => undefined);
    })
    .catch(() => undefined);

  return () => subscription.remove();
}
