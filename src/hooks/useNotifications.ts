import { useCallback, useEffect, useState } from 'react';

import {
  listenToNotificationTaps,
  listenToTokenRefresh,
  registerForPush,
  type RegistrationOutcome,
} from '../services/notificationService';
import { toUserMessage } from '../utils/errors';
import type { NotificationPayload } from '../types/notification';

export type PushStatus = RegistrationOutcome['status'] | 'pending' | 'error';

export type UseNotificationsResult = {
  status: PushStatus;
  message: string | null;
  retry: () => void;
};

const STATUS_MESSAGE: Partial<Record<PushStatus, string>> = {
  'permission-denied':
    'Notificacoes desativadas. Libere a permissao nas configuracoes para receber mensagens novas.',
  unsupported: 'Notificacoes push exigem um aparelho fisico.',
};

/**
 * Registra o aparelho do usuario logado, mantem o token atualizado e trata o
 * toque nas notificacoes. Todos os listeners sao removidos no logout.
 */
export function useNotifications(
  uid: string | null,
  onOpen: (payload: NotificationPayload) => void,
): UseNotificationsResult {
  const [status, setStatus] = useState<PushStatus>('pending');
  const [message, setMessage] = useState<string | null>(null);
  const [attempt, setAttempt] = useState<number>(0);

  useEffect(() => listenToNotificationTaps(onOpen), [onOpen]);

  useEffect(() => {
    if (!uid) {
      setStatus('pending');
      setMessage(null);
      return undefined;
    }
    let active = true;
    registerForPush(uid)
      .then((outcome) => {
        if (!active) return;
        setStatus(outcome.status);
        setMessage(outcome.status === 'no-token' ? outcome.message : STATUS_MESSAGE[outcome.status] ?? null);
      })
      .catch((error: unknown) => {
        if (!active) return;
        setStatus('error');
        setMessage(toUserMessage(error, 'Nao foi possivel registrar este aparelho para notificacoes.'));
      });
    const stopRefresh = listenToTokenRefresh(uid);
    return () => {
      active = false;
      stopRefresh();
    };
  }, [uid, attempt]);

  const retry = useCallback(() => setAttempt((value) => value + 1), []);

  return { status, message, retry };
}
