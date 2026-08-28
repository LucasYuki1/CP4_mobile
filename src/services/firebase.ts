import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApp, getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import * as FirebaseAuth from 'firebase/auth';
import { getDatabase, type Database } from 'firebase/database';

/**
 * O .env.example usa marcadores no formato [NOME_DA_VARIAVEL]. Se um deles
 * sobreviver ate a execucao, o Firebase falha muito mais adiante e com uma
 * mensagem opaca (URL de banco invalida, projeto inexistente). Barramos aqui,
 * onde ainda da para dizer exatamente qual campo falta.
 */
function isPlaceholder(value: string): boolean {
  return /^\[.*\]$/.test(value.trim());
}

function requireEnv(name: string, value: string | undefined): string {
  if (!value || isPlaceholder(value)) {
    throw new Error(
      `Variavel de ambiente ${name} ausente ou nao preenchida. Copie .env.example para .env e preencha os valores do Console do Firebase.`,
    );
  }
  return value;
}

const firebaseConfig = {
  apiKey: requireEnv('EXPO_PUBLIC_FIREBASE_API_KEY', process.env.EXPO_PUBLIC_FIREBASE_API_KEY),
  authDomain: requireEnv('EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN', process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN),
  databaseURL: requireEnv('EXPO_PUBLIC_FIREBASE_DATABASE_URL', process.env.EXPO_PUBLIC_FIREBASE_DATABASE_URL),
  projectId: requireEnv('EXPO_PUBLIC_FIREBASE_PROJECT_ID', process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID),
  storageBucket: requireEnv('EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET', process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET),
  messagingSenderId: requireEnv('EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID', process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID),
  appId: requireEnv('EXPO_PUBLIC_FIREBASE_APP_ID', process.env.EXPO_PUBLIC_FIREBASE_APP_ID),
};

/**
 * O nome do export de persistencia para React Native mudou entre versoes do
 * firebase-js-sdk (getReactNativePersistence -> reactNativeLocalPersistence) e
 * os tipos publicos nem sempre acompanham. Resolvemos em tempo de execucao com
 * um contrato explicito via `unknown` (nunca `any`), preservando a tipagem.
 */
type ReactNativePersistenceExports = {
  reactNativeLocalPersistence?: FirebaseAuth.Persistence;
  getReactNativePersistence?: (storage: unknown) => FirebaseAuth.Persistence;
};

function resolveReactNativePersistence(): FirebaseAuth.Persistence | null {
  const authModule = FirebaseAuth as unknown as ReactNativePersistenceExports;
  if (authModule.reactNativeLocalPersistence) {
    return authModule.reactNativeLocalPersistence;
  }
  if (typeof authModule.getReactNativePersistence === 'function') {
    return authModule.getReactNativePersistence(AsyncStorage);
  }
  return null;
}

function createAuth(app: FirebaseApp): FirebaseAuth.Auth {
  const persistence = resolveReactNativePersistence();
  if (!persistence) {
    // Sem AsyncStorage a sessao nao sobrevive ao fechamento do app.
    return FirebaseAuth.initializeAuth(app);
  }
  return FirebaseAuth.initializeAuth(app, { persistence });
}

const app: FirebaseApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Fast Refresh pode reexecutar este modulo; initializeAuth so pode rodar uma vez.
let authInstance: FirebaseAuth.Auth;
try {
  authInstance = createAuth(app);
} catch {
  authInstance = FirebaseAuth.getAuth(app);
}

export const auth: FirebaseAuth.Auth = authInstance;
export const database: Database = getDatabase(app);
export { app };
