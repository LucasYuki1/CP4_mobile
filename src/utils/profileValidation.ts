import type { ValidationResult } from './groupValidation';

const fail = (message: string): ValidationResult => ({ valid: false, message });

/** Mantem so os digitos e aplica a mascara (99) 99999-9999. */
export function formatPhone(input: string): string {
  const digits = input.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 2) return digits.length > 0 ? `(${digits}` : '';
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

/** Aplica a mascara DD/MM/AAAA enquanto o usuario digita. */
export function formatBirthDate(input: string): string {
  const digits = input.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

export function isValidEmail(email: string): boolean {
  return /^\S+@\S+\.\S+$/.test(email.trim());
}

export function validatePhone(phone: string): ValidationResult {
  const digits = phone.replace(/\D/g, '');
  return digits.length === 10 || digits.length === 11
    ? { valid: true }
    : fail('Informe o celular com DDD, por exemplo (11) 91234-5678.');
}

/** Valida DD/MM/AAAA como data real, no passado e com idade plausivel. */
export function validateBirthDate(value: string, today: Date = new Date()): ValidationResult {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value);
  if (!match) return fail('Informe a data de nascimento no formato DD/MM/AAAA.');
  const [, dd, mm, yyyy] = match;
  const day = Number(dd);
  const month = Number(mm);
  const year = Number(yyyy);
  const date = new Date(year, month - 1, day);
  const isReal =
    date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
  if (!isReal) return fail('Data de nascimento invalida.');
  if (date > today) return fail('A data de nascimento nao pode estar no futuro.');
  if (today.getFullYear() - year > 120) return fail('Data de nascimento invalida.');
  return { valid: true };
}
