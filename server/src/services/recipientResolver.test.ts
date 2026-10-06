import assert from 'node:assert/strict';
import { test } from 'node:test';

import { resolveRecipients } from './recipientResolver';

const members = ['owner', 'ana', 'bia', 'caio'];
const general = { senderId: 'ana', target: { type: 'conversation' as const }, mentionedUserIds: [] };
const toBia = { senderId: 'ana', target: { type: 'member' as const, memberId: 'bia' }, mentionedUserIds: ['bia'] };

test('conversa individual notifica apenas o outro participante', () => {
  const result = resolveRecipients({
    conversationType: 'direct',
    participantIds: ['ana', 'bia'],
    policy: 'disabled',
    message: { senderId: 'ana', target: { type: 'member', memberId: 'bia' }, mentionedUserIds: [] },
  });
  assert.deepEqual(result, ['bia']);
});

test('all_group_messages notifica todos, exceto o remetente', () => {
  const result = resolveRecipients({ conversationType: 'group', participantIds: members, policy: 'all_group_messages', message: general });
  assert.deepEqual(result.sort(), ['bia', 'caio', 'owner']);
});

test('mentioned_members notifica apenas mencionados ou destinatario', () => {
  const result = resolveRecipients({ conversationType: 'group', participantIds: members, policy: 'mentioned_members', message: toBia });
  assert.deepEqual(result, ['bia']);
  const none = resolveRecipients({ conversationType: 'group', participantIds: members, policy: 'mentioned_members', message: general });
  assert.deepEqual(none, []);
});

test('mentioned_members descarta remetente e quem nao e mais integrante', () => {
  const result = resolveRecipients({
    conversationType: 'group',
    participantIds: members,
    policy: 'mentioned_members',
    message: { senderId: 'ana', target: { type: 'conversation' }, mentionedUserIds: ['ana', 'removido', 'caio'] },
  });
  assert.deepEqual(result, ['caio']);
});

test('direct_messages_only e disabled nao geram push em grupo', () => {
  for (const policy of ['direct_messages_only', 'disabled'] as const) {
    assert.deepEqual(resolveRecipients({ conversationType: 'group', participantIds: members, policy, message: toBia }), []);
  }
});
