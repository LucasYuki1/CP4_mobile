import type { ConversationType } from '../types/chat';

export type UsersRouteParams =
  | { mode: 'direct' }
  | {
      mode: 'pickMembers';
      /** Presente na edicao de um grupo existente. */
      groupId?: string;
      /** Integrantes atuais: aparecem marcados e nao podem ser desmarcados aqui. */
      lockedIds: string[];
      selectedIds: string[];
      /** Quantos usuarios ainda podem ser escolhidos sem estourar o limite. */
      maxSelectable: number;
    };

export type GroupFormRouteParams = {
  groupId?: string;
  pickedMemberIds?: string[];
};

export type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  Conversations: undefined;
  Users: UsersRouteParams;
  GroupForm: GroupFormRouteParams;
  Chat: { conversationId: string; conversationType: ConversationType };
  Profile: { uid: string };
  GroupMembers: { groupId: string };
};
