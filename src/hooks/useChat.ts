import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  ensureDirectConversation,
  listenToMessages,
  requestMessageNotification,
  sendMessage,
} from '../services/chatService';
import { syncGroupMembers } from '../services/groupService';
import { otherParticipant } from '../utils/conversationId';
import { isPermissionDenied, toUserMessage } from '../utils/errors';
import type { ChatMessage, ConversationType, MessageTarget } from '../types/chat';

export type OutgoingMessage = {
  text: string;
  target: MessageTarget;
  mentionedUserIds: string[];
};

export type UseChatResult = {
  messages: ChatMessage[];
  loading: boolean;
  error: string | null;
  pushWarning: string | null;
  sending: boolean;
  send: (message: OutgoingMessage) => Promise<boolean>;
  dismissError: () => void;
};

export function useChat(
  conversationId: string,
  conversationType: ConversationType,
  currentUid: string,
): UseChatResult {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [sending, setSending] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [pushWarning, setPushWarning] = useState<string | null>(null);
  // Cada conversa tenta sincronizar o espelho de integrantes no maximo uma vez.
  const syncedRef = useRef<boolean>(false);

  useEffect(() => {
    let active = true;
    let unsubscribe: (() => void) | null = null;
    syncedRef.current = false;

    setLoading(true);
    setMessages([]);
    setError(null);

    const subscribe = (): void => {
      unsubscribe = listenToMessages(conversationId, {
        // Imutabilidade: cada evento produz um novo array.
        onMessageAdded: (message) => {
          setMessages((previous) =>
            previous.some((item) => item.id === message.id) ? previous : [...previous, message],
          );
          setLoading(false);
        },
        onMessageChanged: (message) => {
          setMessages((previous) =>
            previous.map((item) => (item.id === message.id ? message : item)),
          );
        },
        onError: (listenError) => {
          if (!active) return;
          // Grupo recem-criado: o espelho no RTDB pode ainda nao existir.
          if (conversationType === 'group' && isPermissionDenied(listenError) && !syncedRef.current) {
            syncedRef.current = true;
            syncGroupMembers(conversationId)
              .then(() => {
                if (active) subscribe();
              })
              .catch(() => {
                if (!active) return;
                setError('Voce nao participa mais desta conversa.');
                setLoading(false);
              });
            return;
          }
          setError(
            isPermissionDenied(listenError)
              ? 'Voce nao participa mais desta conversa.'
              : 'Falha ao receber mensagens. Verifique sua conexao.',
          );
          setLoading(false);
        },
      });
      // Conversa vazia nunca dispara onChildAdded: o loading termina aqui.
      setLoading(false);
    };

    const prepare =
      conversationType === 'direct'
        ? ensureDirectConversation(currentUid, otherParticipant(conversationId, currentUid))
        : Promise.resolve(null);

    prepare
      .then(() => {
        if (active) subscribe();
      })
      .catch((prepareError: unknown) => {
        if (!active) return;
        setError(toUserMessage(prepareError, 'Nao foi possivel abrir a conversa.'));
        setLoading(false);
      });

    // Remove os listeners ao sair da tela ou trocar de conversa.
    return () => {
      active = false;
      if (unsubscribe) unsubscribe();
    };
  }, [conversationId, conversationType, currentUid]);

  const persist = useCallback(
    (message: OutgoingMessage) =>
      sendMessage({
        conversationId,
        conversationType,
        senderId: currentUid,
        text: message.text,
        target: message.target,
        mentionedUserIds: message.mentionedUserIds,
      }),
    [conversationId, conversationType, currentUid],
  );

  const send = useCallback(
    async (message: OutgoingMessage): Promise<boolean> => {
      setSending(true);
      setPushWarning(null);
      let messageId: string;
      try {
        try {
          messageId = await persist(message);
        } catch (firstError) {
          if (conversationType !== 'group' || !isPermissionDenied(firstError)) throw firstError;
          await syncGroupMembers(conversationId);
          messageId = await persist(message);
        }
        setError(null);
      } catch (sendError) {
        setError(toUserMessage(sendError, 'A mensagem nao foi enviada. Tente novamente.'));
        setSending(false);
        return false;
      }
      setSending(false);

      // O push nao bloqueia a conversa: a mensagem ja esta salva no RTDB.
      requestMessageNotification(conversationId, messageId).catch((pushError: unknown) => {
        setPushWarning(
          toUserMessage(pushError, 'Mensagem enviada, mas a notificacao nao pode ser disparada.'),
        );
      });
      return true;
    },
    [persist, conversationId, conversationType],
  );

  const dismissError = useCallback(() => {
    setError(null);
    setPushWarning(null);
  }, []);

  // A ordenacao acompanha o createdAt definitivo do servidor.
  const orderedMessages = useMemo<ChatMessage[]>(
    () => [...messages].sort((a, b) => a.createdAt - b.createdAt),
    [messages],
  );

  return { messages: orderedMessages, loading, error, pushWarning, sending, send, dismissError };
}
