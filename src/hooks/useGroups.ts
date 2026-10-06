import { useEffect, useMemo, useState } from 'react';

import { listenToGroup, listenToMyGroups } from '../services/groupService';
import { isPermissionDenied } from '../utils/errors';
import { availableSlots } from '../utils/groupValidation';
import type { ChatGroup } from '../types/group';

export type UseMyGroupsResult = { groups: ChatGroup[]; loading: boolean; error: string | null };

export function useMyGroups(uid: string): UseMyGroupsResult {
  const [groups, setGroups] = useState<ChatGroup[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    return listenToMyGroups(
      uid,
      (items) => {
        setGroups(items);
        setError(null);
        setLoading(false);
      },
      () => {
        setError('Nao foi possivel carregar seus grupos.');
        setLoading(false);
      },
    );
  }, [uid]);

  return { groups, loading, error };
}

export type UseGroupResult = {
  group: ChatGroup | null;
  loading: boolean;
  error: string | null;
  /** true quando o usuario deixou de ser integrante (removido ou saiu). */
  revoked: boolean;
  isOwner: boolean;
  slotsLeft: number;
};

export function useGroup(groupId: string | undefined, uid: string): UseGroupResult {
  const [group, setGroup] = useState<ChatGroup | null>(null);
  const [loading, setLoading] = useState<boolean>(Boolean(groupId));
  const [error, setError] = useState<string | null>(null);
  const [revoked, setRevoked] = useState<boolean>(false);

  useEffect(() => {
    if (!groupId) {
      setGroup(null);
      setLoading(false);
      return undefined;
    }
    setLoading(true);
    setRevoked(false);
    return listenToGroup(
      groupId,
      (item) => {
        setGroup(item);
        setRevoked(item === null || !item.memberIds.includes(uid));
        setError(null);
        setLoading(false);
      },
      (listenError) => {
        // As regras negam a leitura assim que o usuario deixa de ser integrante.
        if (isPermissionDenied(listenError)) {
          setRevoked(true);
          setGroup(null);
        } else {
          setError('Nao foi possivel carregar o grupo.');
        }
        setLoading(false);
      },
    );
  }, [groupId, uid]);

  const isOwner = useMemo(() => group?.ownerId === uid, [group, uid]);
  const slotsLeft = useMemo(
    () => (group ? availableSlots(group.memberIds.length, group.memberLimit) : 0),
    [group],
  );

  return { group, loading, error, revoked, isOwner, slotsLeft };
}
