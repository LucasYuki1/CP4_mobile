import { auth } from './firebase';
import { API_URL } from '../config/api';
import { AppError } from '../utils/errors';

/** O Render hiberna servicos gratuitos: a primeira chamada pode levar ~50s. */
const REQUEST_TIMEOUT_MS = 60_000;

type ApiErrorBody = { error?: unknown };

function readErrorMessage(body: unknown, fallback: string): string {
  if (typeof body === 'object' && body !== null) {
    const { error } = body as ApiErrorBody;
    if (typeof error === 'string' && error.length > 0) return error;
  }
  return fallback;
}

/**
 * Chamada autenticada a API da equipe. O Firebase ID Token do usuario atual
 * segue no header Authorization; a API valida o token com o Admin SDK.
 */
export async function callApi<TResponse>(
  path: string,
  init: { method: 'GET' | 'POST'; body?: Record<string, unknown> },
): Promise<TResponse> {
  const user = auth.currentUser;
  if (!user) throw new AppError('Sua sessao expirou. Entre novamente.', 'auth/no-session');
  if (API_URL.length === 0) throw new AppError('API de notificacoes nao configurada.', 'api/no-url');

  const token = await user.getIdToken();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      method: init.method,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      ...(init.body ? { body: JSON.stringify(init.body) } : {}),
      signal: controller.signal,
    });
  } catch {
    throw new AppError('Nao foi possivel falar com o servidor. Verifique sua conexao.', 'api/network');
  } finally {
    clearTimeout(timer);
  }

  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const code = `api/${response.status}`;
    if (response.status === 401) throw new AppError('Sua sessao expirou. Entre novamente.', code);
    if (response.status === 403) throw new AppError('Voce nao tem permissao para esta acao.', code);
    throw new AppError(readErrorMessage(body, 'O servidor recusou a solicitacao.'), code);
  }
  return body as TResponse;
}
