/** Perfil completo do usuario, gravado em Firestore: users/{uid}. */
export type ChatUser = {
  uid: string;
  name: string;
  email: string;
  phoneNumber: string;
  birthDate: string;
  photoUrl: string;
  createdAt: number;
};

/** Formato exato do documento users/{uid} (o uid e o id do documento). */
export type UserDocument = Omit<ChatUser, 'uid'>;

/**
 * Cartao publico em Firestore: publicProfiles/{uid}.
 * Contem apenas o necessario para listar e buscar usuarios. Telefone, e-mail e
 * data de nascimento ficam em users/{uid}, protegidos pelas regras.
 */
export type PublicProfile = {
  uid: string;
  name: string;
  nameLower: string;
  photoUrl: string;
};

export type PublicProfileDocument = Omit<PublicProfile, 'uid'>;

/** Dados coletados na tela de cadastro. */
export type RegistrationInput = {
  name: string;
  email: string;
  password: string;
  phoneNumber: string;
  birthDate: string;
  photoUri: string | null;
};
