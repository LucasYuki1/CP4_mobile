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

/**
 * Um marcador nao substituido ([GOOGLE_WEB_CLIENT_ID]) e um valor vazio dao o
 * mesmo resultado pratico: o Google Sign-In devolve DEVELOPER_ERROR, que nao
 * diz nada a quem esta usando o app. Detectamos aqui para trocar por uma
 * mensagem que aponta a causa real.
 */
function readClientId(value: string | undefined): string {
  if (!value || /^\[.*\]$/.test(value.trim())) return '';
  return value.trim();
}

const GOOGLE_WEB_CLIENT_ID = readClientId(process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID);
const GOOGLE_IOS_CLIENT_ID = readClientId(process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID);

GoogleSignin.configure({
  webClientId: GOOGLE_WEB_CLIENT_ID,
  iosClientId: GOOGLE_IOS_CLIENT_ID,
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
  'sign-in/no-id-token':
    'O Google concluiu o login mas nao emitiu o token de identidade. Verifique o ID do cliente da Web no Firebase.',
  'sign-in/apple-unavailable': 'Entrar com Apple esta disponivel apenas no iOS 13 ou superior.',
  'sign-in/google-not-configured':
    'Login com Google indisponivel: o app foi compilado sem o ID do cliente da Web. Habilite o provedor Google no Firebase e preencha EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID.',
  'DEVELOPER_ERROR':
    'O Google recusou a assinatura deste app. Cadastre no Firebase o SHA-1 do certificado que assinou este APK.',
  '10': 'O Google recusou a assinatura deste app. Cadastre no Firebase o SHA-1 do certificado que assinou este APK.',
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

/**
 * O formato da resposta do Google Sign-In mudou entre versoes maiores.
 *
 * Ate a v12 a biblioteca lancava SIGN_IN_CANCELLED quando a pessoa desistia.
 * Da v13 em diante ela *retorna* um envelope discriminado, e cancelar virou
 * { type: 'cancelled', data: null }. Tratar isso como "sem idToken" faria o
 * app acusar falha do provedor quando o usuario apenas fechou o seletor de
 * contas, entao o cancelamento e reconhecido explicitamente.
 */
type GoogleSignInOutcome =
  | { kind: 'token'; idToken: string }
  | { kind: 'cancelled' }
  | { kind: 'no-token' };

function readGoogleSignInResponse(response: unknown): GoogleSignInOutcome {
  if (typeof response !== 'object' || response === null) return { kind: 'no-token' };
  const root = response as {
    type?: unknown;
    idToken?: unknown;
    data?: { idToken?: unknown } | null;
  };

  if (root.type === 'cancelled' || root.type === 'noSavedCredentialFound') {
    return { kind: 'cancelled' };
  }
  if (typeof root.idToken === 'string') return { kind: 'token', idToken: root.idToken };
  if (root.data && typeof root.data.idToken === 'string') {
    return { kind: 'token', idToken: root.data.idToken };
  }
  return { kind: 'no-token' };
}

export async function signInWithGoogle(): Promise<User> {
  try {
    if (GOOGLE_WEB_CLIENT_ID.length === 0) {
      throw new AuthError(
        MESSAGES['sign-in/google-not-configured'] ?? 'Login com Google indisponivel.',
        'sign-in/google-not-configured',
      );
    }
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    const response: unknown = await GoogleSignin.signIn();
    const outcome = readGoogleSignInResponse(response);

    if (outcome.kind === 'cancelled') {
      throw new AuthError(MESSAGES['sign-in/cancelled'] ?? 'Login cancelado.', 'sign-in/cancelled');
    }
    if (outcome.kind === 'no-token') {
      throw new AuthError(MESSAGES['sign-in/no-id-token'] ?? 'Token ausente.', 'sign-in/no-id-token');
    }

    const credential = GoogleAuthProvider.credential(outcome.idToken);
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
