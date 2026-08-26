import { useEffect, useMemo, useState } from 'react';

import { listenToUsers } from '../services/userService';
import { canNegotiate } from '../utils/chatRules';
import type { ChatUser } from '../types/user';

export type UseContactsResult = {
  contacts: ChatUser[];
  loading: boolean;
  error: string | null;
};

/**
 * Assina a lista de usuarios e devolve apenas os compativeis com a regra
 * do marketplace. O filtro fica em useMemo porque a lista bruta muda a cada
 * novo cadastro e refiltrar a cada render seria trabalho repetido.
 */
export function useContacts(currentUser: ChatUser | null): UseContactsResult {
  const [allUsers, setAllUsers] = useState<ChatUser[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!currentUser) {
      setAllUsers([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsubscribe = listenToUsers(
      (users) => {
        setAllUsers(users);
        setLoading(false);
        setError(null);
      },
      () => {
        setLoading(false);
        setError('Nao foi possivel carregar os participantes. Verifique sua conexao.');
      },
    );

    return unsubscribe;
  }, [currentUser]);

  const contacts = useMemo<ChatUser[]>(() => {
    if (!currentUser) return [];
    return allUsers
      .filter((candidate) => canNegotiate(currentUser, candidate))
      .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  }, [allUsers, currentUser]);

  return { contacts, loading, error };
}
