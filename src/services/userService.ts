import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  writeBatch,
} from 'firebase/firestore';

import { callApi } from './apiClient';
import { firestore } from './firebase';
import { isPermissionDenied } from '../utils/errors';
import type { ChatUser, PublicProfile, PublicProfileDocument, UserDocument } from '../types/user';

const USERS = 'users';
const PUBLIC_PROFILES = 'publicProfiles';

function readString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

/** Converte o documento bruto do Firestore em ChatUser, sem confiar no formato. */
export function toChatUser(uid: string, raw: unknown): ChatUser | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const data = raw as Partial<Record<keyof UserDocument, unknown>>;
  if (typeof data.name !== 'string') return null;
  return {
    uid,
    name: data.name,
    email: readString(data.email),
    phoneNumber: readString(data.phoneNumber),
    birthDate: readString(data.birthDate),
    photoUrl: readString(data.photoUrl),
    createdAt: typeof data.createdAt === 'number' ? data.createdAt : 0,
  };
}

function toPublicProfile(uid: string, raw: unknown): PublicProfile | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const data = raw as Partial<Record<keyof PublicProfileDocument, unknown>>;
  if (typeof data.name !== 'string') return null;
  return {
    uid,
    name: data.name,
    nameLower: readString(data.nameLower),
    photoUrl: readString(data.photoUrl),
  };
}

/** Grava o perfil completo e o cartao publico na mesma operacao atomica. */
export async function createUserProfile(user: ChatUser): Promise<void> {
  const profile: UserDocument = {
    name: user.name,
    email: user.email,
    phoneNumber: user.phoneNumber,
    birthDate: user.birthDate,
    photoUrl: user.photoUrl,
    createdAt: user.createdAt,
  };
  const card: PublicProfileDocument = {
    name: user.name,
    nameLower: user.name.toLocaleLowerCase('pt-BR'),
    photoUrl: user.photoUrl,
  };
  const batch = writeBatch(firestore);
  batch.set(doc(firestore, USERS, user.uid), profile);
  batch.set(doc(firestore, PUBLIC_PROFILES, user.uid), card);
  await batch.commit();
}

export async function updateOwnPhoto(uid: string, photoUrl: string): Promise<void> {
  const batch = writeBatch(firestore);
  batch.update(doc(firestore, USERS, uid), { photoUrl });
  batch.update(doc(firestore, PUBLIC_PROFILES, uid), { photoUrl });
  await batch.commit();
}

export async function fetchOwnProfile(uid: string): Promise<ChatUser | null> {
  const snapshot = await getDoc(doc(firestore, USERS, uid));
  return snapshot.exists() ? toChatUser(uid, snapshot.data()) : null;
}

/**
 * Perfil de outro usuario.
 *
 * As regras do Firestore liberam users/{uid} quando existe conversa individual
 * entre os dois (o id da conversa e deterministico, entao a regra consegue
 * checar com exists()). Compartilhar um grupo nao e verificavel pela regra sem
 * saber qual grupo, entao nesse caso a API confere os grupos no servidor e
 * devolve apenas os campos permitidos.
 */
export async function fetchProfile(uid: string): Promise<ChatUser | null> {
  try {
    const snapshot = await getDoc(doc(firestore, USERS, uid));
    if (snapshot.exists()) return toChatUser(uid, snapshot.data());
  } catch (error) {
    if (!isPermissionDenied(error)) throw error;
  }
  const response = await callApi<{ profile: unknown }>(`/profiles/${encodeURIComponent(uid)}`, {
    method: 'GET',
  });
  return toChatUser(uid, response.profile);
}

/** Escuta todos os cartoes publicos (nome e foto) para listagem e busca. */
export function listenToPublicProfiles(
  onProfiles: (profiles: PublicProfile[]) => void,
  onError: (error: Error) => void,
): () => void {
  return onSnapshot(
    collection(firestore, PUBLIC_PROFILES),
    (snapshot) => {
      const profiles = snapshot.docs
        .map((item) => toPublicProfile(item.id, item.data()))
        .filter((item): item is PublicProfile => item !== null);
      onProfiles(profiles);
    },
    (error) => onError(error),
  );
}
