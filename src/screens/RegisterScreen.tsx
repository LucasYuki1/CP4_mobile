import React, { useCallback, useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text } from 'react-native';

import { ErrorMessage } from '../components/ErrorMessage';
import { FormField } from '../components/FormField';
import { PhotoPicker } from '../components/PhotoPicker';
import { PrimaryButton } from '../components/PrimaryButton';
import { useAuth } from '../hooks/useAuth';
import { colors, spacing, typography } from '../theme';
import { toUserMessage } from '../utils/errors';
import {
  formatBirthDate,
  formatPhone,
  isValidEmail,
  validateBirthDate,
  validatePhone,
} from '../utils/profileValidation';

export function RegisterScreen(): React.JSX.Element {
  const { register } = useAuth();
  const [name, setName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [confirmation, setConfirmation] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [birthDate, setBirthDate] = useState<string>('');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  /** Primeira regra violada, na ordem dos campos; null quando tudo esta valido. */
  const validationError = useMemo<string | null>(() => {
    if (name.trim().length < 2) return 'Informe seu nome.';
    if (!isValidEmail(email)) return 'Informe um e-mail valido.';
    if (password.length < 6) return 'A senha precisa ter no minimo 6 caracteres.';
    if (password !== confirmation) return 'A confirmacao nao confere com a senha.';
    const phoneResult = validatePhone(phone);
    if (!phoneResult.valid) return phoneResult.message;
    const birthResult = validateBirthDate(birthDate);
    if (!birthResult.valid) return birthResult.message;
    return null;
  }, [name, email, password, confirmation, phone, birthDate]);

  const handleSubmit = useCallback(async () => {
    if (validationError) {
      setError(validationError);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await register({ name, email, password, phoneNumber: phone, birthDate, photoUri });
    } catch (caught) {
      setError(toUserMessage(caught, 'Nao foi possivel criar a conta. Tente novamente.'));
      setLoading(false);
    }
  }, [validationError, register, name, email, password, phone, birthDate, photoUri]);

  const handlePhone = useCallback((value: string) => setPhone(formatPhone(value)), []);
  const handleBirthDate = useCallback((value: string) => setBirthDate(formatBirthDate(value)), []);

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.hint}>Todos os campos sao obrigatorios, exceto a foto.</Text>

        <PhotoPicker uri={photoUri ?? ''} name={name} onPicked={setPhotoUri} disabled={loading} />

        <FormField label="Nome" value={name} onChangeText={setName} autoComplete="name" />
        <FormField
          label="E-mail"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
        />
        <FormField
          label="Senha"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          hint="Minimo 6 caracteres"
        />
        <FormField
          label="Confirmar senha"
          value={confirmation}
          onChangeText={setConfirmation}
          secureTextEntry
        />
        <FormField
          label="Celular"
          value={phone}
          onChangeText={handlePhone}
          keyboardType="phone-pad"
          placeholder="(11) 91234-5678"
        />
        <FormField
          label="Data de nascimento"
          value={birthDate}
          onChangeText={handleBirthDate}
          keyboardType="number-pad"
          placeholder="DD/MM/AAAA"
        />

        {error ? <ErrorMessage message={error} /> : null}

        <PrimaryButton label="Criar conta" onPress={handleSubmit} loading={loading} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.canvas },
  container: { padding: spacing.xl, gap: spacing.lg, paddingBottom: spacing.xxl },
  hint: { ...typography.caption, color: colors.muted },
});
