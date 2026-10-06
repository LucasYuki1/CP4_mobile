import { Router, type Request, type Response } from 'express';
import { FieldValue } from 'firebase-admin/firestore';

import { authenticate } from '../middleware/authenticate';
import {
  conversationTypeOf,
  isSafeId,
  readConversation,
  readMessage,
  readUserName,
} from '../services/conversationRepository';
import { adminFirestore } from '../services/firebaseAdmin';
import { loadDevices, sendPush } from '../services/notificationSender';
import { resolveRecipients } from '../services/recipientResolver';
import type { AuthLocals } from '../types';

export const notificationsRouter = Router();

type DispatchBody = { conversationId?: unknown; messageId?: unknown };

/**
 * POST /notifications/messages
 * Body: { conversationId, messageId }. Os destinatarios NUNCA vem do cliente:
 * sao calculados aqui a partir do Realtime Database e do Firestore.
 */
notificationsRouter.post(
  '/messages',
  authenticate,
  async (req: Request<Record<string, string>, unknown, DispatchBody>, res: Response<unknown, AuthLocals>) => {
    const { conversationId, messageId } = req.body ?? {};
    if (!isSafeId(conversationId) || !isSafeId(messageId)) {
      res.status(400).json({ error: 'conversationId e messageId sao obrigatorios.' });
      return;
    }
    const uid = res.locals.uid;

    // 1. A mensagem existe no RTDB e foi enviada pelo usuario autenticado.
    const message = await readMessage(conversationId, messageId);
    if (!message) {
      res.status(404).json({ error: 'Mensagem nao encontrada.' });
      return;
    }
    if (message.senderId !== uid) {
      res.status(403).json({ error: 'A mensagem nao pertence ao usuario autenticado.' });
      return;
    }
    if (message.conversationType !== conversationTypeOf(conversationId)) {
      res.status(400).json({ error: 'Tipo de conversa inconsistente.' });
      return;
    }

    // 2. Participantes e politica vem do Firestore; o remetente precisa ser participante ativo.
    const conversation = await readConversation(conversationId);
    if (!conversation || !conversation.participantIds.includes(uid)) {
      res.status(403).json({ error: 'Usuario nao participa desta conversa.' });
      return;
    }

    // 3. Idempotencia: create() falha se o documento ja existir, entao uma
    //    mesma mensagem nunca dispara push duas vezes, mesmo com reenvio
    //    simultaneo da requisicao.
    const dispatchRef = adminFirestore.collection('notificationDispatches').doc(`${conversationId}__${messageId}`);
    try {
      await dispatchRef.create({ conversationId, messageId, senderId: uid, status: 'processing', createdAt: FieldValue.serverTimestamp() });
    } catch {
      res.status(200).json({ status: 'duplicate', recipients: 0 });
      return;
    }

    try {
      const recipients = resolveRecipients({
        conversationType: conversation.type,
        participantIds: conversation.participantIds,
        policy: conversation.policy,
        message,
      });
      if (recipients.length === 0) {
        await dispatchRef.update({ status: 'skipped', recipients: 0 });
        res.status(200).json({ status: 'skipped', recipients: 0 });
        return;
      }

      // 4. Conteudo sem expor o texto da mensagem: so quem enviou e onde.
      const senderName = await readUserName(uid);
      const mentioned = new Set(message.mentionedUserIds);
      if (message.target.type === 'member') mentioned.add(message.target.memberId);
      const devices = await loadDevices(recipients);
      const title = conversation.type === 'group' ? (conversation.groupName ?? 'Grupo') : senderName;
      const body =
        conversation.type === 'group'
          ? `${senderName} enviou uma nova mensagem`
          : 'Voce recebeu uma nova mensagem';
      const summary = await sendPush(devices, {
        title,
        body: recipients.every((recipient) => mentioned.has(recipient)) && conversation.type === 'group'
          ? `${senderName} mencionou voce`
          : body,
        data: { conversationId, conversationType: conversation.type, messageId },
      });

      await dispatchRef.update({ status: 'sent', recipients: recipients.length, ...summary });
      res.status(200).json({ status: 'sent', recipients: recipients.length, ...summary });
    } catch (error) {
      // Libera a chave para que uma nova tentativa possa enviar.
      await dispatchRef.delete().catch(() => undefined);
      throw error;
    }
  },
);
