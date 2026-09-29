/**
 * URL publica da API de notificacoes, hospedada no Render (ver server/ e
 * render.yaml). Pode ser sobrescrita por EXPO_PUBLIC_API_URL no .env.
 */
const DEFAULT_API_URL = 'https://chat-firebase-api.onrender.com';

function readApiUrl(): string {
  const raw = process.env.EXPO_PUBLIC_API_URL ?? DEFAULT_API_URL;
  return raw.trim().replace(/\/+$/, '');
}

export const API_URL: string = readApiUrl();
