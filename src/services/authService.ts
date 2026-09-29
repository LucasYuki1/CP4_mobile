import {
  createUserWithEmailAndPassword,
  deleteUser,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  type User,
} from 'firebase/auth';

import { auth } from './firebase';
import { profilePhotoPath, uploadImage } from './storageService';
import { createUserProfile } from './userService';
import { AppError, toUserMessage } from '../utils/errors';
import type { ChatUser, RegistrationInput } from '../types/user';

function authError(error: unknown, fallback: string): AppError {
  return error instanceof AppError ? error : new AppError(toUserMessage(error, fallback));
}

/**
 * Cadastro com e-mail e senha. A ordem importa: a conta precisa existir para
 * que as regras do Storage e do Firestore reconhecam o uid. Se o perfil nao
 * puder ser gravado, a conta recem-criada e removida para nao ficar orfa.
 */
export async function registerWithEmail(input: RegistrationInput): Promise<ChatUser> {
  let created: User | null = null;
  try {
    const credential = await createUserWithEmailAndPassword(auth, input.email.trim(), input.password);
    created = credential.user;
    await updateProfile(created, { displayName: input.name.trim() });

    const photoUrl = input.photoUri
      ? await uploadImage(input.photoUri, profilePhotoPath(created.uid))
      : '';

    const profile: ChatUser = {
      uid: created.uid,
      name: input.name.trim(),
      email: input.email.trim().toLowerCase(),
      phoneNumber: input.phoneNumber,
      birthDate: input.birthDate,
      photoUrl,
      createdAt: Date.now(),
    };
    await createUserProfile(profile);
    return profile;
  } catch (error) {
    if (created) {
      await deleteUser(created).catch(() => undefined);
    }
    throw authError(error, 'Nao foi possivel concluir o cadastro. Tente novamente.');
  }
}

export async function signInWithEmail(email: string, password: string): Promise<User> {
  try {
    const credential = await signInWithEmailAndPassword(auth, email.trim(), password);
    return credential.user;
  } catch (error) {
    throw authError(error, 'Nao foi possivel entrar. Tente novamente.');
  }
}

/** Observa a sessao; o Firebase restaura o usuario salvo no AsyncStorage. */
export function observeSession(onChange: (user: User | null) => void): () => void {
  return onAuthStateChanged(auth, onChange);
}

export async function signOutUser(): Promise<void> {
  try {
    await signOut(auth);
  } catch (error) {
    throw authError(error, 'Nao foi possivel sair. Tente novamente.');
  }
}
