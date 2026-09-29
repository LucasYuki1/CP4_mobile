import { useEffect, useMemo, useState } from 'react';

import { useMyGroups } from './useGroups';
import { usePublicProfiles } from './usePublicProfiles';
import { listenToDirectConversations } from '../services/chatService';
import { otherParticipant } from '../utils/conversationId';
import type { ConversationSummary, DirectConversation } from '../types/chat';

export type UseConversationsResult = {
  conversations: ConversationSummary[];
  loading: boolean;
  error: string | null;
};

/** Une conversas individuais e grupos numa unica lista, ordenada por data. */
export function useConversations(uid: string): UseConversationsResult {
  const [directs, setDirects] = useState<DirectConversation[]>([]);
  const [directLoading, setDirectLoading] = useState<boolean>(true);
  const [directError, setDirectError] = useState<string | null>(null);
  const { groups, loading: groupsLoading, error: groupsError } = useMyGroups(uid);
  const { byId, loading: profilesLoading } = usePublicProfiles();

  useEffect(() => {
    setDirectLoading(true);
    return listenToDirectConversations(
      uid,
      (items) => {
        setDirects(items);
        setDirectError(null);
        setDirectLoading(false);
      },
      () => {
        setDirectError('Nao foi possivel carregar suas conversas.');
        setDirectLoading(false);
      },
    );
  }, [uid]);

  const conversations = useMemo<ConversationSummary[]>(() => {
    const directItems = directs.map((conversation): ConversationSummary => {
      const otherUid = otherParticipant(conversation.id, uid);
      const profile = byId.get(otherUid);
      return {
        kind: 'direct',
        id: conversation.id,
        title: profile?.name ?? 'Usuario',
        photoUrl: profile?.photoUrl ?? '',
        otherUid,
        createdAt: conversation.createdAt,
      };
    });
    const groupItems = groups.map(
      (group): ConversationSummary => ({
        kind: 'group',
        id: group.id,
        title: group.name,
        photoUrl: group.photoUrl,
        memberCount: group.memberIds.length,
        memberLimit: group.memberLimit,
        createdAt: group.updatedAt,
      }),
    );
    return [...directItems, ...groupItems].sort((a, b) => b.createdAt - a.createdAt);
  }, [directs, groups, byId, uid]);

  return {
    conversations,
    loading: directLoading || groupsLoading || profilesLoading,
    error: directError ?? groupsError,
  };
}
