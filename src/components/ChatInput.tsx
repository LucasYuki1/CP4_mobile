import React, { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { colors, radius, spacing, typography } from '../theme';

export type ChatInputProps = {
  onSend: (text: string) => Promise<boolean>;
  sending: boolean;
  placeholder?: string;
};

export function ChatInput({
  onSend,
  sending,
  placeholder = 'Escreva sua proposta',
}: ChatInputProps): React.JSX.Element {
  const [text, setText] = useState<string>('');
  const canSend = text.trim().length > 0 && !sending;

  const handleSend = useCallback(async () => {
    if (!canSend) return;
    const delivered = await onSend(text);
    // O rascunho so e limpo se o Realtime Database confirmou a gravacao.
    if (delivered) setText('');
  }, [canSend, onSend, text]);

  return (
    <View style={styles.container}>
      <TextInput
        value={text}
        onChangeText={setText}
        placeholder={placeholder}
        placeholderTextColor={colors.muted}
        style={styles.input}
        multiline
        maxLength={1000}
        accessibilityLabel="Campo de mensagem"
      />
      <Pressable
        onPress={handleSend}
        disabled={!canSend}
        accessibilityRole="button"
        accessibilityLabel="Enviar mensagem"
        style={({ pressed }) => [
          styles.button,
          !canSend ? styles.buttonBlocked : null,
          pressed && canSend ? styles.buttonPressed : null,
        ]}
      >
        <Text style={styles.buttonLabel}>{sending ? '...' : 'Enviar'}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.hairline,
  },
  input: {
    flex: 1,
    minHeight: 48,
    maxHeight: 120,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    backgroundColor: colors.canvas,
    borderRadius: radius.md,
    ...typography.body,
    color: colors.ink,
  },
  button: {
    height: 48,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonBlocked: { opacity: 0.4 },
  buttonPressed: { opacity: 0.85 },
  buttonLabel: { ...typography.eyebrow, color: colors.surface },
});
