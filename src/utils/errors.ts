/**
 * Traduz erros do Firebase, da rede e da API para mensagens compreensiveis.
 * Nunca repassa a mensagem original: ela pode expor caminhos internos.
 */
const MESSAGES: Record<string, string> = {
  'auth/invalid-email': 'E-mail em formato invalido.',
  'auth/invalid-credential': 'E-mail ou senha incorretos.',
  'auth/wrong-password': 'E-mail ou senha incorretos.',
  'auth/user-not-found': 'E-mail ou senha incorretos.',
  'auth/email-already-in-use': 'Este e-mail ja possui cadastro. Faca login.',
  'auth/weak-password': 'A senha precisa ter no minimo 6 caracteres.',
  'auth/too-many-requests': 'Muitas tentativas seguidas. Aguarde e tente de novo.',
  'auth/network-request-failed': 'Sem conexao com a internet.',
  'auth/user-token-expired': 'Sua sessao expirou. Entre novamente.',
  'auth/requires-recent-login': 'Sua sessao expirou. Entre novamente.',
  'auth/user-disabled': 'Esta conta foi desativada.',
  'auth/operation-not-allowed': 'Login por e-mail e senha nao esta habilitado no Firebase.',
  'permission-denied': 'Voce nao tem permissao para esta acao.',
  PERMISSION_DENIED: 'Voce nao tem permissao para esta acao.',
  unavailable: 'Servico indisponivel. Verifique sua conexao.',
  'deadline-exceeded': 'A operacao demorou demais. Verifique sua conexao.',
  'failed-precondition': 'A operacao nao pode ser concluida no estado atual.',
  aborted: 'Outra alteracao aconteceu ao mesmo tempo. Tente novamente.',
  'not-found': 'O item solicitado nao existe mais.',
  'storage/unauthorized': 'Voce nao tem permissao para enviar esta imagem.',
  'storage/canceled': 'Envio da imagem cancelado.',
  'storage/retry-limit-exceeded': 'Falha de conexao ao enviar a imagem.',
};

/** Erro de dominio com mensagem ja pronta para a interface. */
export class AppError extends Error {
  readonly code: string;
  constructor(message: string, code = 'app/error') {
    super(message);
    this.name = 'AppError';
    this.code = code;
  }
}

export function errorCode(error: unknown): string | null {
  if (typeof error === 'object' && error !== null && 'code' in error) {
    const code = (error as { code: unknown }).code;
    return typeof code === 'string' ? code : null;
  }
  return null;
}

export function toUserMessage(error: unknown, fallback: string): string {
  if (error instanceof AppError) return error.message;
  const code = errorCode(error);
  if (code) {
    const normalized = code.replace(/^firestore\//, '');
    const known = MESSAGES[code] ?? MESSAGES[normalized];
    if (known) return known;
  }
  if (error instanceof Error && /permission.denied/i.test(error.message)) {
    return MESSAGES['permission-denied'] ?? fallback;
  }
  if (error instanceof TypeError && /network/i.test(error.message)) {
    return 'Sem conexao com a internet.';
  }
  return fallback;
}

export function isPermissionDenied(error: unknown): boolean {
  const code = errorCode(error);
  if (code === 'permission-denied' || code === 'PERMISSION_DENIED') return true;
  return error instanceof Error && /permission.denied/i.test(error.message);
}
