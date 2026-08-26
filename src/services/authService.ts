import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  OAuthProvider,
  signInWithCredential,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  type User,
} from 'firebase/auth';
import { Platform } from 'react-native';

import { auth } from './firebase';
import { upsertUserProfile } from './userService';
import type { AuthProvider } from '../types/user';

GoogleSignin.configure({
  webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? '',
  iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ?? '',
  offlineAccess: false,
});

export class AuthError extends Error {
  readonly code: string;
  constructor(message: string, code: string) {
    super(message);
    this.name = 'AuthError';
    this.code = code;
  }
}

const MESSAGES: Record<string, string> = {
  'auth/invalid-email': 'E-mail em formato invalido.',
  'auth/invalid-credential': 'E-mail ou senha incorretos.',
  'auth/wrong-password': 'E-mail ou senha incorretos.',
  'auth/user-not-found': 'Nao existe conta com este e-mail.',
  'auth/email-already-in-use': 'Este e-mail ja possui cadastro. Faca login.',
  'auth/weak-password': 'A senha precisa ter no minimo 6 caracteres.',
  'auth/too-many-requests': 'Muitas tentativas seguidas. Aguarde e tente de novo.',
  'auth/network-request-failed': 'Sem conexao com a internet.',
  'auth/account-exists-with-different-credential':
    'Este e-mail ja esta vinculado a outro provedor. Entre pelo provedor original.',
  'auth/operation-not-allowed': 'Provedor nao habilitado no Console do Firebase.',
  'sign-in/cancelled': 'Login cancelado.',
  'sign-in/no-id-token': 'O provedor nao devolveu um token de identidade.',
  'sign-in/apple-unavailable': 'Entrar com Apple esta disponivel apenas no iOS 13 ou superior.',
};

/** Converte qualquer erro em AuthError com mensagem em portugues. */
export function toAuthError(error: unknown): AuthError {
  if (error instanceof AuthError) return error;

  if (typeof error === 'object' && error !== null && 'code' in error) {
    const code = String((error as { code: unknown }).code);
    if (code === 'ERR_REQUEST_CANCELED' || code === 'SIGN_IN_CANCELLED' || code === '-5') {
      return new AuthError(MESSAGES['sign-in/cancelled'] ?? 'Login cancelado.', 'sign-in/cancelled');
    }
    const message = MESSAGES[code];
    if (message) return new AuthError(message, code);
    return new AuthError('Nao foi possivel concluir a autenticacao. Tente novamente.', code);
  }

  return new AuthError('Erro inesperado na autenticacao.', 'auth/unknown');
}

/**
 * O provedor e a espinha dorsal da regra do marketplace, entao ele e lido do
 * providerData retornado pelo Firebase e gravado uma unica vez em /users/$uid.
 * Contas vinculadas (mesmo e-mail em dois provedores) nao mudam o papel depois.
 */
export function resolveProvider(user: User): AuthProvider {
  const ids = user.providerData.map((entry) => entry.providerId);
  if (ids.includes('apple.com')) return 'apple';
  if (ids.includes('google.com')) return 'google';
  return 'password';
}

export async function signUpWithEmail(
  name: string,
  email: string,
  password: string,
): Promise<User> {
  try {
    const credential = await createUserWithEmailAndPassword(auth, email.trim(), password);
    await updateProfile(credential.user, { displayName: name.trim() });
    await upsertUserProfile(credential.user, 'password', name.trim());
    return credential.user;
  } catch (error) {
    throw toAuthError(error);
  }
}

export async function signInWithEmail(email: string, password: string): Promise<User> {
  try {
    const credential = await signInWithEmailAndPassword(auth, email.trim(), password);
    await upsertUserProfile(credential.user, 'password');
    return credential.user;
  } catch (error) {
    throw toAuthError(error);
  }
}

/** O formato da resposta do Google Sign-In mudou entre versoes maiores. */
function extractGoogleIdToken(response: unknown): string | null {
  if (typeof response !== 'object' || response === null) return null;
  const root = response as { idToken?: unknown; data?: { idToken?: unknown } };
  if (typeof root.idToken === 'string') return root.idToken;
  if (root.data && typeof root.data.idToken === 'string') return root.data.idToken;
  return null;
}

export async function signInWithGoogle(): Promise<User> {
  try {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    const response: unknown = await GoogleSignin.signIn();
    const idToken = extractGoogleIdToken(response);
    if (!idToken) {
      throw new AuthError(MESSAGES['sign-in/no-id-token'] ?? 'Token ausente.', 'sign-in/no-id-token');
    }
    const credential = GoogleAuthProvider.credential(idToken);
    const result = await signInWithCredential(auth, credential);
    await upsertUserProfile(result.user, 'google');
    return result.user;
  } catch (error) {
    throw toAuthError(error);
  }
}

export async function isAppleSignInAvailable(): Promise<boolean> {
  if (Platform.OS !== 'ios') return false;
  return AppleAuthentication.isAvailableAsync();
}

export async function signInWithApple(): Promise<User> {
  try {
    if (!(await isAppleSignInAvailable())) {
      throw new AuthError(
        MESSAGES['sign-in/apple-unavailable'] ?? 'Indisponivel.',
        'sign-in/apple-unavailable',
      );
    }

    // A Apple assina o hash do nonce; o Firebase confere o nonce original.
    const rawNonce = Crypto.randomUUID();
    const hashedNonce = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      rawNonce,
    );

    const appleCredential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
      nonce: hashedNonce,
    });

    if (!appleCredential.identityToken) {
      throw new AuthError(MESSAGES['sign-in/no-id-token'] ?? 'Token ausente.', 'sign-in/no-id-token');
    }

    const credential = new OAuthProvider('apple.com').credential({
      idToken: appleCredential.identityToken,
      rawNonce,
    });
    const result = await signInWithCredential(auth, credential);

    // A Apple so devolve o nome na primeira autorizacao: gravamos naquele momento.
    const givenName = appleCredential.fullName?.givenName ?? '';
    const familyName = appleCredential.fullName?.familyName ?? '';
    const appleName = `${givenName} ${familyName}`.trim();
    await upsertUserProfile(result.user, 'apple', appleName.length > 0 ? appleName : undefined);
    return result.user;
  } catch (error) {
    throw toAuthError(error);
  }
}

export async function signOutUser(): Promise<void> {
  try {
    const isGoogleSignedIn = GoogleSignin.getCurrentUser() !== null;
    if (isGoogleSignedIn) {
      await GoogleSignin.signOut();
    }
  } catch {
    // Falha ao limpar a sessao nativa do Google nao impede o logout do Firebase.
  }
  try {
    await signOut(auth);
  } catch (error) {
    throw toAuthError(error);
  }
}
