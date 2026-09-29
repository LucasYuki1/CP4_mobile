import { Router, type Request, type Response } from 'express';

import { authenticate } from '../middleware/authenticate';
import { isSafeId } from '../services/conversationRepository';
import { adminDatabase, adminFirestore } from '../services/firebaseAdmin';
import type { AuthLocals } from '../types';

export const groupsRouter = Router();

/**
 * POST /groups/:groupId/sync
 *
 * As regras do Realtime Database nao conseguem ler o Firestore. Este endpoint
 * copia memberIds do documento do grupo (fonte da verdade) para
 * groupMembers/{groupId} no RTDB, que as regras usam para liberar leitura e
 * escrita de mensagens. So a API escreve nesse no. E idempotente: pode ser
 * chamado quantas vezes for preciso, sempre converge para o Firestore.
 */
groupsRouter.post(
  '/:groupId/sync',
  authenticate,
  async (req: Request<{ groupId: string }>, res: Response<unknown, AuthLocals>) => {
    const { groupId } = req.params;
    if (!isSafeId(groupId) || groupId.includes('_')) {
      res.status(400).json({ error: 'groupId invalido.' });
      return;
    }
    const uid = res.locals.uid;
    const mirrorRef = adminDatabase.ref(`groupMembers/${groupId}`);
    const [groupSnapshot, mirrorSnapshot] = await Promise.all([
      adminFirestore.collection('groups').doc(groupId).get(),
      mirrorRef.get(),
    ]);

    const memberIds: string[] = groupSnapshot.exists
      ? ((groupSnapshot.get('memberIds') as unknown[] | undefined) ?? []).filter(
          (item): item is string => typeof item === 'string',
        )
      : [];
    const mirrored = mirrorSnapshot.val() as Record<string, unknown> | null;
    const wasMember = mirrored !== null && uid in mirrored;

    // Integrante atual ou recem-removido (para propagar a propria remocao).
    if (!memberIds.includes(uid) && !wasMember) {
      res.status(403).json({ error: 'Usuario nao participa deste grupo.' });
      return;
    }

    if (memberIds.length === 0) {
      await mirrorRef.remove();
    } else {
      await mirrorRef.set(Object.fromEntries(memberIds.map((member) => [member, true])));
    }
    res.status(200).json({ memberCount: memberIds.length });
  },
);
