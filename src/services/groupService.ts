import {
  collection,
  doc,
  onSnapshot,
  query,
  runTransaction,
  setDoc,
  updateDoc,
  where,
  type DocumentSnapshot,
} from 'firebase/firestore';

import { callApi } from './apiClient';
import { firestore } from './firebase';
import { groupPhotoPath, uploadImage } from './storageService';
import { AppError } from '../utils/errors';
import {
  isNotificationPolicy,
  validateGroupName,
  validateMemberLimit,
  validateMembers,
  type ValidationResult,
} from '../utils/groupValidation';
import type { ChatGroup, GroupDocument, GroupFormInput } from '../types/group';
import type { NotificationPolicy } from '../types/notification';

const GROUPS = 'groups';

function assertValid(result: ValidationResult): void {
  if (!result.valid) throw new AppError(result.message, 'group/invalid');
}

function toChatGroup(id: string, raw: unknown): ChatGroup | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const data = raw as Partial<Record<keyof GroupDocument, unknown>>;
  if (
    typeof data.name !== 'string' ||
    typeof data.ownerId !== 'string' ||
    !Array.isArray(data.memberIds) ||
    typeof data.memberLimit !== 'number' ||
    !isNotificationPolicy(data.notificationPolicy)
  ) {
    return null;
  }
  return {
    id,
    name: data.name,
    photoUrl: typeof data.photoUrl === 'string' ? data.photoUrl : '',
    ownerId: data.ownerId,
    memberIds: data.memberIds.filter((item): item is string => typeof item === 'string'),
    memberLimit: data.memberLimit,
    notificationPolicy: data.notificationPolicy,
    notificationUpdatedBy:
      typeof data.notificationUpdatedBy === 'string' ? data.notificationUpdatedBy : data.ownerId,
    createdAt: typeof data.createdAt === 'number' ? data.createdAt : 0,
    updatedAt: typeof data.updatedAt === 'number' ? data.updatedAt : 0,
  };
}

function readGroup(snapshot: DocumentSnapshot): ChatGroup {
  const group = snapshot.exists() ? toChatGroup(snapshot.id, snapshot.data()) : null;
  if (!group) throw new AppError('Este grupo nao existe mais.', 'group/not-found');
  return group;
}

/**
 * Espelha os integrantes do Firestore no Realtime Database (groupMembers).
 * As regras do RTDB nao leem o Firestore, entao e esse espelho que decide
 * quem le e escreve mensagens do grupo. So a API escreve nele, sempre a
 * partir do documento do grupo no Firestore, que e a fonte da verdade.
 */
export async function syncGroupMembers(groupId: string): Promise<void> {
  await callApi<{ memberCount: number }>(`/groups/${encodeURIComponent(groupId)}/sync`, {
    method: 'POST',
  });
}

export async function createGroup(ownerId: string, input: GroupFormInput): Promise<string> {
  const memberIds = Array.from(new Set([ownerId, ...input.memberIds]));
  assertValid(validateGroupName(input.name));
  assertValid(validateMemberLimit(input.memberLimit, memberIds.length));
  assertValid(validateMembers(memberIds, input.memberLimit));

  const groupRef = doc(collection(firestore, GROUPS));
  const now = Date.now();
  const record: GroupDocument = {
    name: input.name.trim(),
    photoUrl: '',
    ownerId,
    memberIds,
    memberLimit: input.memberLimit,
    notificationPolicy: input.notificationPolicy,
    notificationUpdatedBy: ownerId,
    createdAt: now,
    updatedAt: now,
  };
  await setDoc(groupRef, record);

  // A regra do Storage confere o proprietario no Firestore, entao a foto so
  // pode subir depois que o documento do grupo existe.
  if (input.photoUri) {
    const photoUrl = await uploadImage(input.photoUri, groupPhotoPath(groupRef.id));
    await updateDoc(groupRef, { photoUrl, updatedAt: Date.now() });
  }

  await syncGroupMembers(groupRef.id);
  return groupRef.id;
}

type GroupMutation = (group: ChatGroup) => Partial<GroupDocument>;

/**
 * Toda alteracao passa por uma transacao: o Firestore rele o documento e
 * reexecuta a funcao se outra escrita acontecer no meio. Junto com a regra
 * memberIds.size() <= memberLimit, avaliada no commit, isso impede que
 * adicoes simultaneas ultrapassem o limite.
 */
async function mutateGroup(
  groupId: string,
  actorId: string,
  mutation: GroupMutation,
  options: { ownerOnly: boolean },
): Promise<void> {
  const groupRef = doc(firestore, GROUPS, groupId);
  await runTransaction(firestore, async (transaction) => {
    const group = readGroup(await transaction.get(groupRef));
    if (options.ownerOnly && group.ownerId !== actorId) {
      throw new AppError('Somente o proprietario pode alterar o grupo.', 'group/not-owner');
    }
    const patch = mutation(group);
    transaction.update(groupRef, { ...patch, updatedAt: Date.now() });
  });
  await syncGroupMembers(groupId);
}

export function addMembers(groupId: string, ownerId: string, newMemberIds: string[]): Promise<void> {
  return mutateGroup(
    groupId,
    ownerId,
    (group) => {
      const memberIds = Array.from(new Set([...group.memberIds, ...newMemberIds]));
      if (memberIds.length > group.memberLimit) {
        const free = Math.max(group.memberLimit - group.memberIds.length, 0);
        throw new AppError(
          free === 0
            ? 'O grupo atingiu o limite de integrantes.'
            : `So restam ${free} vaga(s) neste grupo.`,
          'group/full',
        );
      }
      return { memberIds };
    },
    { ownerOnly: true },
  );
}

export function removeMember(groupId: string, ownerId: string, memberId: string): Promise<void> {
  return mutateGroup(
    groupId,
    ownerId,
    (group) => {
      if (memberId === group.ownerId) {
        throw new AppError('O proprietario nao pode ser removido do grupo.', 'group/owner');
      }
      const memberIds = group.memberIds.filter((uid) => uid !== memberId);
      assertValid(validateMembers(memberIds, group.memberLimit));
      return { memberIds };
    },
    { ownerOnly: true },
  );
}

export function leaveGroup(groupId: string, uid: string): Promise<void> {
  return mutateGroup(
    groupId,
    uid,
    (group) => {
      if (group.ownerId === uid) {
        throw new AppError('O proprietario nao pode sair do proprio grupo.', 'group/owner');
      }
      return { memberIds: group.memberIds.filter((item) => item !== uid) };
    },
    { ownerOnly: false },
  );
}

export type GroupSettingsPatch = {
  name: string;
  memberLimit: number;
  notificationPolicy: NotificationPolicy;
};

export function updateGroupSettings(
  groupId: string,
  ownerId: string,
  settings: GroupSettingsPatch,
): Promise<void> {
  return mutateGroup(
    groupId,
    ownerId,
    (group) => {
      assertValid(validateGroupName(settings.name));
      assertValid(validateMemberLimit(settings.memberLimit, group.memberIds.length));
      const patch: Partial<GroupDocument> = {
        name: settings.name.trim(),
        memberLimit: settings.memberLimit,
      };
      if (settings.notificationPolicy !== group.notificationPolicy) {
        patch.notificationPolicy = settings.notificationPolicy;
        patch.notificationUpdatedBy = ownerId;
      }
      return patch;
    },
    { ownerOnly: true },
  );
}

export async function updateGroupPhoto(groupId: string, localUri: string): Promise<void> {
  const photoUrl = await uploadImage(localUri, groupPhotoPath(groupId));
  await updateDoc(doc(firestore, GROUPS, groupId), { photoUrl, updatedAt: Date.now() });
}

/** Escuta os grupos dos quais o usuario e integrante ativo. */
export function listenToMyGroups(
  uid: string,
  onGroups: (groups: ChatGroup[]) => void,
  onError: (error: Error) => void,
): () => void {
  const groupsQuery = query(collection(firestore, GROUPS), where('memberIds', 'array-contains', uid));
  return onSnapshot(
    groupsQuery,
    (snapshot) => {
      const groups = snapshot.docs
        .map((item) => toChatGroup(item.id, item.data()))
        .filter((item): item is ChatGroup => item !== null);
      onGroups(groups);
    },
    (error) => onError(error),
  );
}

/** Escuta um grupo. Se o usuario for removido, a regra passa a negar e onError dispara. */
export function listenToGroup(
  groupId: string,
  onGroup: (group: ChatGroup | null) => void,
  onError: (error: Error) => void,
): () => void {
  return onSnapshot(
    doc(firestore, GROUPS, groupId),
    (snapshot) => onGroup(snapshot.exists() ? toChatGroup(snapshot.id, snapshot.data()) : null),
    (error) => onError(error),
  );
}
