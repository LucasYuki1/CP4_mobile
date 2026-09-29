import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApp, getApps, initializeApp, type FirebaseApp, type FirebaseOptions } from 'firebase/app';
import * as FirebaseAuth from 'firebase/auth';
import { getDatabase, type Database } from 'firebase/database';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getStorage, type FirebaseStorage } from 'firebase/storage';

import rawConfig from '../../firebaseConfig.json';

const REQUIRED_KEYS = [
  'apiKey',
  'authDomain',
  'databaseURL',
  'projectId',
  'storageBucket',
  'messagingSenderId',
  'appId',
] as const;

type RequiredKey = (typeof REQUIRED_KEYS)[number];
type ClientConfig = Record<RequiredKey, string>;

/**
 * firebaseConfig.json fica versionado na raiz, como pede o enunciado, e contem
 * apenas a configuracao do SDK cliente. Um campo ausente ou ainda com o
 * marcador PREENCHER faria o Firebase falhar muito depois com erro opaco;
 * barramos aqui dizendo exatamente qual campo falta.
 */
function readConfig(source: Record<string, unknown>): ClientConfig {
  const entries = REQUIRED_KEYS.map((key): [RequiredKey, string] => {
    const value = source[key];
    if (typeof value !== 'string' || value.length === 0 || value.startsWith('PREENCHER')) {
      throw new Error(`firebaseConfig.json: o campo "${key}" nao foi preenchido.`);
    }
    return [key, value];
  });
  return Object.fromEntries(entries) as ClientConfig;
}

const firebaseConfig: FirebaseOptions = readConfig(rawConfig);

/**
 * O nome do export de persistencia para React Native mudou entre versoes do
 * firebase-js-sdk e os tipos publicos nem sempre acompanham. Resolvemos em
 * tempo de execucao com um contrato explicito via `unknown` (nunca `any`).
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
export const firestore: Firestore = getFirestore(app);
export const storage: FirebaseStorage = getStorage(app);
export { app };
