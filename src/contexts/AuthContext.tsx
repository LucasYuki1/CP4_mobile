import React, {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import {
  observeSession,
  registerWithEmail,
  signInWithEmail,
  signOutUser,
} from '../services/authService';
import { disableCurrentDevice } from '../services/notificationService';
import { fetchOwnProfile } from '../services/userService';
import { toUserMessage } from '../utils/errors';
import type { ChatUser, RegistrationInput } from '../types/user';

export type AuthContextValue = {
  user: ChatUser | null;
  initializing: boolean;
  sessionError: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (input: RegistrationInput) => Promise<void>;
  logout: () => Promise<void>;
  replaceUser: (user: ChatUser) => void;
  clearSessionError: () => void;
};

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

type AuthProviderProps = { children: ReactNode };

export function AuthProvider({ children }: AuthProviderProps): React.JSX.Element {
  const [user, setUser] = useState<ChatUser | null>(null);
  const [initializing, setInitializing] = useState<boolean>(true);
  const [sessionError, setSessionError] = useState<string | null>(null);
  // Durante o cadastro o Auth ja emite o usuario, mas o perfil ainda esta sendo gravado.
  const registeringRef = useRef<boolean>(false);

  // Fonte unica da verdade da sessao. O listener e removido no unmount.
  useEffect(() => {
    let active = true;
    const unsubscribe = observeSession((firebaseUser) => {
      if (!firebaseUser) {
        setUser(null);
        setInitializing(false);
        return;
      }
      if (registeringRef.current) return;

      fetchOwnProfile(firebaseUser.uid)
        .then(async (profile) => {
          if (!active) return;
          if (!profile) {
            setSessionError('Perfil nao encontrado para esta conta. Crie uma nova conta.');
            await signOutUser().catch(() => undefined);
            return;
          }
          setUser(profile);
          setSessionError(null);
        })
        .catch((error: unknown) => {
          if (!active) return;
          setUser(null);
          setSessionError(toUserMessage(error, 'Nao foi possivel carregar seu perfil.'));
        })
        .finally(() => {
          if (active) setInitializing(false);
        });
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    setSessionError(null);
    await signInWithEmail(email, password);
  }, []);

  const register = useCallback(async (input: RegistrationInput) => {
    setSessionError(null);
    registeringRef.current = true;
    try {
      const profile = await registerWithEmail(input);
      setUser(profile);
    } finally {
      registeringRef.current = false;
    }
  }, []);

  const logout = useCallback(async () => {
    if (user) await disableCurrentDevice(user.uid);
    await signOutUser();
    // Limpa ja o estado: a arvore autenticada desmonta junto com seus listeners.
    setUser(null);
  }, [user]);

  const replaceUser = useCallback((next: ChatUser) => setUser(next), []);
  const clearSessionError = useCallback(() => setSessionError(null), []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      initializing,
      sessionError,
      login,
      register,
      logout,
      replaceUser,
      clearSessionError,
    }),
    [user, initializing, sessionError, login, register, logout, replaceUser, clearSessionError],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
