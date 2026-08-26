import type { AuthProvider } from '../types/user';

export type RootStackParamList = {
  Users: undefined;
  Chat: {
    otherUid: string;
    otherName: string;
    otherProvider: AuthProvider;
  };
};
