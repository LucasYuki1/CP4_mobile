import type { NextFunction, Request, Response } from 'express';

import { adminAuth } from '../services/firebaseAdmin';
import type { AuthLocals } from '../types';

/**
 * Exige "Authorization: Bearer <Firebase ID Token>" e valida o token com o
 * Admin SDK (assinatura, expiracao, projeto e revogacao). O uid confirmado
 * fica em res.locals.uid; nada do corpo da requisicao identifica o usuario.
 */
export async function authenticate(
  req: Request,
  res: Response<unknown, AuthLocals>,
  next: NextFunction,
): Promise<void> {
  const header = req.header('authorization') ?? '';
  const match = /^Bearer\s+(.+)$/i.exec(header);
  if (!match || !match[1]) {
    res.status(401).json({ error: 'Token de autenticacao ausente.' });
    return;
  }
  try {
    const decoded = await adminAuth.verifyIdToken(match[1], true);
    res.locals.uid = decoded.uid;
    next();
  } catch {
    res.status(401).json({ error: 'Token de autenticacao invalido ou expirado.' });
  }
}
