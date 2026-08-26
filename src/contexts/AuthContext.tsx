import React, {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { onAuthStateChanged } from 'firebase/auth';

import { auth } from '../services/firebase';
import { resolveProvider, signOutUser } from '../services/authService';
import { upsertUserProfile } from '../services/userService';
import type { ChatUser, MarketRole } from '../types/user';
import { roleOf } from '../utils/chatRules';

export type AuthContextValue = {
  user: ChatUser | null;
  role: MarketRole | null;
  initializing: boolean;
  profileError: string | null;
  logout: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

type AuthProviderProps = { children: ReactNode };

export function AuthProvider({ children }: AuthProviderProps): React.JSX.Element {
  const [user, setUser] = useState<ChatUser | null>(null);
  const [initializing, setInitializing] = useState<boolean>(true);
  const [profileError, setProfileError] = useState<string | null>(null);

  // Fonte unica da verdade da sessao. O listener e removido no unmount.
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        setUser(null);
        setProfileError(null);
        setInitializing(false);
        return;
      }

      try {
        const provider = resolveProvider(firebaseUser);
        const profile = await upsertUserProfile(firebaseUser, provider);
        setUser(profile);
        setProfileError(null);
      } catch {
        setUser(null);
        setProfileError('Nao foi possivel carregar seu perfil. Verifique a conexao e entre de novo.');
      } finally {
        setInitializing(false);
      }
    });

    return unsubscribe;
  }, []);

  const logout = useCallback(async () => {
    await signOutUser();
    // onAuthStateChanged limpa o estado; isso evita um frame com dados do usuario anterior.
    setUser(null);
  }, []);

  const role = useMemo<MarketRole | null>(
    () => (user ? roleOf(user.provider) : null),
    [user],
  );

  const value = useMemo<AuthContextValue>(
    () => ({ user, role, initializing, profileError, logout }),
    [user, role, initializing, profileError, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
