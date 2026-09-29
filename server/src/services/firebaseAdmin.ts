import { cert, getApps, initializeApp, type App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getDatabase } from 'firebase-admin/database';
import { getFirestore } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value || value.trim().length === 0) {
    throw new Error(`Variavel de ambiente ${name} nao configurada.`);
  }
  return value;
}

/**
 * As credenciais administrativas vem exclusivamente das variaveis secretas da
 * hospedagem. A chave privada costuma ser colada com "\n" literais; aqui eles
 * voltam a ser quebras de linha reais.
 */
function createApp(): App {
  const existing = getApps()[0];
  if (existing) return existing;
  return initializeApp({
    credential: cert({
      projectId: requireEnv('FIREBASE_PROJECT_ID'),
      clientEmail: requireEnv('FIREBASE_CLIENT_EMAIL'),
      privateKey: requireEnv('FIREBASE_PRIVATE_KEY').replace(/\\n/g, '\n'),
    }),
    databaseURL: requireEnv('FIREBASE_DATABASE_URL'),
  });
}

const app = createApp();

export const adminAuth = getAuth(app);
export const adminFirestore = getFirestore(app);
export const adminDatabase = getDatabase(app);
export const adminMessaging = getMessaging(app);
