import { NOTIFICATION_POLICIES, type NotificationPolicy } from '../types/notification';

export const MIN_GROUP_MEMBERS = 2;
export const MAX_GROUP_LIMIT = 50;
export const MAX_GROUP_NAME = 60;

export type ValidationResult = { valid: true } | { valid: false; message: string };

const ok: ValidationResult = { valid: true };
const fail = (message: string): ValidationResult => ({ valid: false, message });

/** Converte o texto digitado em limite; retorna null se nao for inteiro. */
export function parseMemberLimit(text: string): number | null {
  const trimmed = text.trim();
  if (!/^\d+$/.test(trimmed)) return null;
  const value = Number(trimmed);
  return Number.isSafeInteger(value) ? value : null;
}

export function validateMemberLimit(limit: number | null, currentMembers: number): ValidationResult {
  if (limit === null || !Number.isInteger(limit)) {
    return fail('O limite de integrantes precisa ser um numero inteiro.');
  }
  if (limit < MIN_GROUP_MEMBERS) {
    return fail(`O limite minimo e ${MIN_GROUP_MEMBERS} integrantes.`);
  }
  if (limit > MAX_GROUP_LIMIT) {
    return fail(`O limite maximo permitido e ${MAX_GROUP_LIMIT} integrantes.`);
  }
  if (limit < currentMembers) {
    return fail(
      `O limite nao pode ser menor que a quantidade atual de integrantes (${currentMembers}).`,
    );
  }
  return ok;
}

export function validateGroupName(name: string): ValidationResult {
  const trimmed = name.trim();
  if (trimmed.length === 0) return fail('Informe o nome do grupo.');
  if (trimmed.length > MAX_GROUP_NAME) {
    return fail(`O nome do grupo deve ter no maximo ${MAX_GROUP_NAME} caracteres.`);
  }
  return ok;
}

export function validateMembers(memberIds: readonly string[], limit: number): ValidationResult {
  if (memberIds.length < MIN_GROUP_MEMBERS) {
    return fail('Selecione pelo menos um integrante alem de voce.');
  }
  if (memberIds.length > limit) {
    return fail(`O grupo aceita no maximo ${limit} integrantes, incluindo o proprietario.`);
  }
  return ok;
}

export function availableSlots(memberCount: number, limit: number): number {
  return Math.max(limit - memberCount, 0);
}

export function isNotificationPolicy(value: unknown): value is NotificationPolicy {
  return typeof value === 'string' && (NOTIFICATION_POLICIES as readonly string[]).includes(value);
}

export const POLICY_LABEL: Record<NotificationPolicy, string> = {
  all_group_messages: 'Todas as mensagens',
  mentioned_members: 'Somente mencionados',
  direct_messages_only: 'Somente conversas individuais',
  disabled: 'Desativado',
};

export const POLICY_DESCRIPTION: Record<NotificationPolicy, string> = {
  all_group_messages: 'Todos os integrantes, exceto o remetente, recebem push.',
  mentioned_members: 'So quem for mencionado ou escolhido como destinatario recebe push.',
  direct_messages_only: 'Mensagens deste grupo nao geram push.',
  disabled: 'Nenhuma mensagem deste grupo gera push.',
};
