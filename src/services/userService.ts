import { get, onValue, ref, set, update } from 'firebase/database';
import type { User } from 'firebase/auth';

import { database } from './firebase';
import type { AuthProvider, ChatUser, UserRecord } from '../types/user';

const USERS_PATH = 'users';

function isAuthProvider(value: unknown): value is AuthProvider {
  return value === 'password' || value === 'google' || value === 'apple';
}

/** Converte o no bruto do Realtime Database em ChatUser, descartando registros invalidos. */
function toChatUser(uid: string, raw: unknown): ChatUser | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const record = raw as Partial<UserRecord>;
  if (typeof record.name !== 'string' || !isAuthProvider(record.provider)) return null;
  return {
    uid,
    name: record.name,
    email: typeof record.email === 'string' ? record.email : null,
    provider: record.provider,
    createdAt: typeof record.createdAt === 'number' ? record.createdAt : 0,
  };
}

function fallbackName(user: User): string {
  if (user.displayName && user.displayName.trim().length > 0) return user.displayName.trim();
  if (user.email) {
    const [localPart] = user.email.split('@');
    if (localPart) return localPart;
  }
  return 'Participante';
}

/**
 * Cria o perfil no primeiro acesso e apenas atualiza nome/e-mail depois.
 * O campo provider nunca e reescrito: e ele que define o papel no marketplace,
 * e as Security Rules tambem recusam a alteracao.
 */
export async function upsertUserProfile(
  user: User,
  provider: AuthProvider,
  preferredName?: string,
): Promise<ChatUser> {
  const userRef = ref(database, `${USERS_PATH}/${user.uid}`);
  const snapshot = await get(userRef);
  const name = preferredName ?? fallbackName(user);

  if (!snapshot.exists()) {
    const record: UserRecord = {
      name,
      provider,
      createdAt: Date.now(),
      ...(user.email ? { email: user.email } : {}),
    };
    await set(userRef, record);
    return { uid: user.uid, name, email: user.email, provider, createdAt: record.createdAt };
  }

  const existing = toChatUser(user.uid, snapshot.val());
  const patch: Partial<UserRecord> = { name };
  if (user.email) patch.email = user.email;
  await update(userRef, patch);

  return {
    uid: user.uid,
    name,
    email: user.email,
    provider: existing?.provider ?? provider,
    createdAt: existing?.createdAt ?? Date.now(),
  };
}

export async function fetchUserProfile(uid: string): Promise<ChatUser | null> {
  const snapshot = await get(ref(database, `${USERS_PATH}/${uid}`));
  if (!snapshot.exists()) return null;
  return toChatUser(uid, snapshot.val());
}

/**
 * Escuta a lista completa de usuarios. O filtro pela regra do marketplace
 * acontece na camada de apresentacao (useContacts), mantendo o service
 * responsavel apenas pelo acesso a dados.
 * Retorna a funcao que remove o listener.
 */
export function listenToUsers(
  onUsers: (users: ChatUser[]) => void,
  onError: (error: Error) => void,
): () => void {
  const usersRef = ref(database, USERS_PATH);
  return onValue(
    usersRef,
    (snapshot) => {
      const users: ChatUser[] = [];
      snapshot.forEach((child) => {
        const user = toChatUser(child.key ?? '', child.val());
        if (user) users.push(user);
      });
      onUsers(users);
    },
    (error) => onError(error),
  );
}
