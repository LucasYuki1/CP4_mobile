import { useCallback, useEffect, useMemo, useState } from 'react';

import { ensureConversation, listenToMessages, sendMessage } from '../services/chatService';
import type { ChatMessage } from '../types/chat';

export type UseChatResult = {
  messages: ChatMessage[];
  loading: boolean;
  error: string | null;
  sending: boolean;
  send: (text: string) => Promise<boolean>;
  dismissError: () => void;
};

export function useChat(currentUid: string, otherUid: string): UseChatResult {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [sending, setSending] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    let unsubscribe: (() => void) | null = null;

    setLoading(true);
    setMessages([]);

    ensureConversation(currentUid, otherUid)
      .then((conversation) => {
        if (!active) return;
        setConversationId(conversation.id);

        unsubscribe = listenToMessages(conversation.id, {
          // Imutabilidade: cada evento cria um novo array, nunca altera o anterior.
          onMessageAdded: (message) => {
            setMessages((previous) =>
              previous.some((item) => item.id === message.id)
                ? previous
                : [...previous, message],
            );
            setLoading(false);
          },
          onMessageChanged: (message) => {
            setMessages((previous) =>
              previous.map((item) => (item.id === message.id ? message : item)),
            );
          },
          onError: () => {
            setError('Falha ao receber mensagens. Verifique sua conexao.');
            setLoading(false);
          },
        });

        // Conversa sem mensagens nunca dispara onChildAdded: encerramos o loading.
        setLoading(false);
      })
      .catch(() => {
        if (!active) return;
        setError('Nao foi possivel abrir a conversa.');
        setLoading(false);
      });

    // Remocao dos listeners ao sair da tela ou trocar de contato.
    return () => {
      active = false;
      if (unsubscribe) unsubscribe();
    };
  }, [currentUid, otherUid]);

  const send = useCallback(
    async (text: string): Promise<boolean> => {
      if (!conversationId) {
        setError('A conversa ainda esta sendo carregada.');
        return false;
      }
      setSending(true);
      try {
        await sendMessage({ conversationId, senderId: currentUid, receiverId: otherUid, text });
        setError(null);
        return true;
      } catch {
        setError('A mensagem nao foi enviada. Toque em enviar novamente.');
        return false;
      } finally {
        setSending(false);
      }
    },
    [conversationId, currentUid, otherUid],
  );

  const dismissError = useCallback(() => setError(null), []);

  // A ordenacao acompanha o createdAt definitivo do servidor.
  const orderedMessages = useMemo<ChatMessage[]>(
    () => [...messages].sort((a, b) => a.createdAt - b.createdAt),
    [messages],
  );

  return { messages: orderedMessages, loading, error, sending, send, dismissError };
}
