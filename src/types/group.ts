import type { NotificationPolicy } from './notification';

export type ChatGroup = {
  id: string;
  name: string;
  photoUrl: string;
  ownerId: string;
  memberIds: string[];
  memberLimit: number;
  notificationPolicy: NotificationPolicy;
  notificationUpdatedBy: string;
  createdAt: number;
  updatedAt: number;
};

/** Formato do documento groups/{groupId} (o id e o id do documento). */
export type GroupDocument = Omit<ChatGroup, 'id'>;

export type GroupFormInput = {
  name: string;
  memberIds: string[];
  memberLimit: number;
  notificationPolicy: NotificationPolicy;
  photoUri: string | null;
};
