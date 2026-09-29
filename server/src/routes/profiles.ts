import { Router, type Request, type Response } from 'express';

import { authenticate } from '../middleware/authenticate';
import { isSafeId } from '../services/conversationRepository';
import { adminFirestore } from '../services/firebaseAdmin';
import type { AuthLocals } from '../types';

export const profilesRouter = Router();

async function shareContext(requester: string, target: string): Promise<boolean> {
  if (requester === target) return true;
  const directId = [requester, target].sort().join('_');
  const direct = await adminFirestore.collection('directConversations').doc(directId).get();
  if (direct.exists) return true;
  const groups = await adminFirestore
    .collection('groups')
    .where('memberIds', 'array-contains', requester)
    .get();
  return groups.docs.some((group) => {
    const members: unknown = group.get('memberIds');
    return Array.isArray(members) && members.includes(target);
  });
}

/**
 * GET /profiles/:uid
 * As regras do Firestore liberam o perfil quando ha conversa individual, mas
 * nao conseguem descobrir sozinhas se dois usuarios compartilham um grupo.
 * Esta rota faz essa verificacao no servidor e devolve so os campos permitidos.
 */
profilesRouter.get(
  '/:uid',
  authenticate,
  async (req: Request<{ uid: string }>, res: Response<unknown, AuthLocals>) => {
    const target = req.params.uid;
    if (!isSafeId(target)) {
      res.status(400).json({ error: 'uid invalido.' });
      return;
    }
    if (!(await shareContext(res.locals.uid, target))) {
      res.status(403).json({ error: 'Voces nao compartilham uma conversa ou grupo.' });
      return;
    }
    const snapshot = await adminFirestore.collection('users').doc(target).get();
    if (!snapshot.exists) {
      res.status(404).json({ error: 'Perfil nao encontrado.' });
      return;
    }
    const read = (field: string): string => {
      const value: unknown = snapshot.get(field);
      return typeof value === 'string' ? value : '';
    };
    res.status(200).json({
      profile: {
        name: read('name'),
        email: read('email'),
        phoneNumber: read('phoneNumber'),
        birthDate: read('birthDate'),
        photoUrl: read('photoUrl'),
        createdAt: Number(snapshot.get('createdAt') ?? 0),
      },
    });
  },
);
