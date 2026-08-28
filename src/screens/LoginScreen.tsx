import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { ErrorMessage } from '../components/ErrorMessage';
import { PrimaryButton } from '../components/PrimaryButton';
import { colors, radius, roleColor, spacing, typography } from '../theme';
import {
  isAppleSignInAvailable,
  signInWithApple,
  signInWithEmail,
  signInWithGoogle,
  signUpWithEmail,
  toAuthError,
} from '../services/authService';

type Mode = 'signin' | 'signup';
type PendingAction = 'email' | 'google' | 'apple' | null;

export function LoginScreen(): React.JSX.Element {
  const [mode, setMode] = useState<Mode>('signin');
  const [name, setName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [pending, setPending] = useState<PendingAction>(null);
  const [error, setError] = useState<string | null>(null);
  const [appleAvailable, setAppleAvailable] = useState<boolean>(false);

  useEffect(() => {
    let active = true;
    isAppleSignInAvailable()
      .then((available) => {
        if (active) setAppleAvailable(available);
      })
      .catch(() => {
        if (active) setAppleAvailable(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const emailFormValid = useMemo<boolean>(() => {
    const emailOk = /\S+@\S+\.\S+/.test(email.trim());
    const passwordOk = password.length >= 6;
    const nameOk = mode === 'signin' || name.trim().length >= 2;
    return emailOk && passwordOk && nameOk;
  }, [email, password, name, mode]);

  const handleEmailSubmit = useCallback(async () => {
    setPending('email');
    setError(null);
    try {
      if (mode === 'signup') {
        await signUpWithEmail(name, email, password);
      } else {
        await signInWithEmail(email, password);
      }
    } catch (caught) {
      setError(toAuthError(caught).message);
    } finally {
      setPending(null);
    }
  }, [mode, name, email, password]);

  const handleGoogle = useCallback(async () => {
    setPending('google');
    setError(null);
    try {
      await signInWithGoogle();
    } catch (caught) {
      const authError = toAuthError(caught);
      if (authError.code !== 'sign-in/cancelled') setError(authError.message);
    } finally {
      setPending(null);
    }
  }, []);

  const handleApple = useCallback(async () => {
    setPending('apple');
    setError(null);
    try {
      await signInWithApple();
    } catch (caught) {
      const authError = toAuthError(caught);
      if (authError.code !== 'sign-in/cancelled') setError(authError.message);
    } finally {
      setPending(null);
    }
  }, []);

  const toggleMode = useCallback(() => {
    setMode((previous) => (previous === 'signin' ? 'signup' : 'signin'));
    setError(null);
  }, []);

  const busy = pending !== null;

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.eyebrow}>Balcao</Text>
          <Text style={styles.title}>Dois lados do balcao</Text>
          <Text style={styles.lead}>
            Sua forma de entrar define seu papel: conta com e-mail e senha e vendedor, login
            com Google ou Apple e comprador. A negociacao acontece sempre entre lados opostos.
          </Text>
        </View>

        <View style={styles.sides}>
          <View style={[styles.sideCard, { borderColor: roleColor.seller.strong }]}>
            <Text style={[styles.sideRole, { color: roleColor.seller.strong }]}>Vendedor</Text>
            <Text style={styles.sideHint}>E-mail e senha</Text>
          </View>
          <View style={[styles.sideCard, { borderColor: roleColor.buyer.strong }]}>
            <Text style={[styles.sideRole, { color: roleColor.buyer.strong }]}>Comprador</Text>
            <Text style={styles.sideHint}>Google ou Apple</Text>
          </View>
        </View>

        {error ? <ErrorMessage message={error} /> : null}

        <View style={styles.form}>
          <Text style={styles.formTitle}>
            {mode === 'signin' ? 'Entrar como vendedor' : 'Criar conta de vendedor'}
          </Text>

          {mode === 'signup' ? (
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Nome da loja ou do vendedor"
              placeholderTextColor={colors.muted}
              autoCapitalize="words"
              style={styles.input}
              accessibilityLabel="Nome"
            />
          ) : null}

          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="E-mail"
            placeholderTextColor={colors.muted}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            style={styles.input}
            accessibilityLabel="E-mail"
          />
          <TextInput
            value={password}
            onChangeText={setPassword}
            placeholder="Senha (minimo 6 caracteres)"
            placeholderTextColor={colors.muted}
            secureTextEntry
            style={styles.input}
            accessibilityLabel="Senha"
          />

          <PrimaryButton
            label={mode === 'signin' ? 'Entrar' : 'Criar conta'}
            onPress={handleEmailSubmit}
            loading={pending === 'email'}
            disabled={!emailFormValid || busy}
          />

          <Pressable onPress={toggleMode} disabled={busy} accessibilityRole="button">
            <Text style={styles.toggle}>
              {mode === 'signin' ? 'Ainda nao vendo aqui. Criar conta' : 'Ja tenho conta. Entrar'}
            </Text>
          </Pressable>
        </View>

        <View style={styles.divider}>
          <View style={styles.rule} />
          <Text style={styles.dividerLabel}>Ou entre como comprador</Text>
          <View style={styles.rule} />
        </View>

        <View style={styles.social}>
          <PrimaryButton
            label="Continuar com Google"
            onPress={handleGoogle}
            variant="outline"
            loading={pending === 'google'}
            disabled={busy}
          />
          {/*
            O botao fica sempre na tela, e nao apenas no iOS: a Apple nao oferece
            login nativo em Android, entao fora do iOS ele aparece desabilitado
            com a razao escrita logo abaixo. Esconder o botao faria parecer que o
            provedor nao foi implementado.
          */}
          <PrimaryButton
            label="Continuar com Apple"
            onPress={handleApple}
            variant="outline"
            loading={pending === 'apple'}
            disabled={busy || !appleAvailable}
          />
          {!appleAvailable ? (
            <Text style={styles.appleNote}>
              Entrar com Apple exige iOS 13 ou superior. Em Android o botao fica
              desabilitado porque a Apple nao oferece login nativo nesta plataforma.
            </Text>
          ) : null}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.canvas },
  scroll: { padding: spacing.xl, gap: spacing.xl },
  header: { gap: spacing.sm, paddingTop: spacing.xl },
  eyebrow: { ...typography.eyebrow, color: colors.muted },
  title: { ...typography.title, color: colors.ink },
  lead: { ...typography.body, color: colors.muted, lineHeight: 22 },
  sides: { flexDirection: 'row', gap: spacing.md },
  sideCard: {
    flex: 1,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.lg,
    backgroundColor: colors.surface,
    gap: 2,
  },
  sideRole: { ...typography.eyebrow },
  sideHint: { ...typography.caption, color: colors.muted },
  form: { gap: spacing.md },
  formTitle: { ...typography.subtitle, color: colors.ink },
  input: {
    height: 52,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.hairline,
    paddingHorizontal: spacing.lg,
    ...typography.body,
    color: colors.ink,
  },
  toggle: { ...typography.caption, color: colors.ink, textAlign: 'center', paddingTop: spacing.sm },
  divider: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  rule: { flex: 1, height: 1, backgroundColor: colors.hairline },
  dividerLabel: { ...typography.eyebrow, fontSize: 10, color: colors.muted },
  social: { gap: spacing.md, paddingBottom: spacing.xxl },
  appleNote: { ...typography.caption, color: colors.muted, textAlign: 'center' },
});
