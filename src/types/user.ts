export type AuthProvider = 'password' | 'google' | 'apple';

/** Papel no marketplace, derivado exclusivamente do provedor de autenticacao. */
export type MarketRole = 'seller' | 'buyer';

/** Modelo de dominio do usuario, usado em toda a interface. */
export type ChatUser = {
  uid: string;
  name: string;
  email: string | null;
  provider: AuthProvider;
  createdAt: number;
};

/** Formato exato gravado em /users/$uid no Realtime Database. */
export type UserRecord = {
  name: string;
  email?: string;
  provider: AuthProvider;
  createdAt: number;
};
