import React, { useCallback, useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { ErrorMessage } from '../components/ErrorMessage';
import { FormField } from '../components/FormField';
import { PrimaryButton } from '../components/PrimaryButton';
import { useAuth } from '../hooks/useAuth';
import { colors, spacing, typography } from '../theme';
import { toUserMessage } from '../utils/errors';
import { isValidEmail } from '../utils/profileValidation';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Login'>;

export function LoginScreen({ navigation }: Props): React.JSX.Element {
  const { login, sessionError, clearSessionError } = useAuth();
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const formValid = useMemo(() => isValidEmail(email) && password.length >= 6, [email, password]);

  const handleLogin = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await login(email, password);
    } catch (caught) {
      setError(toUserMessage(caught, 'Nao foi possivel entrar. Tente novamente.'));
    } finally {
      setLoading(false);
    }
  }, [login, email, password]);

  const goToRegister = useCallback(() => {
    clearSessionError();
    navigation.navigate('Register');
  }, [navigation, clearSessionError]);

  const shownError = error ?? sessionError;

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.hero}>
          <Text style={styles.eyebrow}>Chat Firebase</Text>
          <Text style={styles.title}>Converse com pessoas e grupos em tempo real</Text>
        </View>

        {shownError ? <ErrorMessage message={shownError} /> : null}

        <FormField
          label="E-mail"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          placeholder="voce@exemplo.com"
        />
        <FormField
          label="Senha"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete="password"
          placeholder="Minimo 6 caracteres"
        />

        <PrimaryButton label="Entrar" onPress={handleLogin} loading={loading} disabled={!formValid} />

        <Pressable onPress={goToRegister} accessibilityRole="button" style={styles.link}>
          <Text style={styles.linkLabel}>Nao tem conta? Criar conta</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.canvas },
  container: { padding: spacing.xl, gap: spacing.lg, flexGrow: 1, justifyContent: 'center' },
  hero: { gap: spacing.sm, marginBottom: spacing.lg },
  eyebrow: { ...typography.eyebrow, color: colors.direct },
  title: { ...typography.title, color: colors.ink },
  link: { alignItems: 'center', paddingVertical: spacing.md },
  linkLabel: { ...typography.eyebrow, color: colors.ink },
});
