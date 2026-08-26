import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, typography } from '../theme';

export type ErrorMessageProps = {
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
};

export function ErrorMessage({
  message,
  onRetry,
  retryLabel = 'Tentar de novo',
}: ErrorMessageProps): React.JSX.Element {
  return (
    <View style={styles.container} accessibilityRole="alert">
      <Text style={styles.eyebrow}>Nao deu certo</Text>
      <Text style={styles.message}>{message}</Text>
      {onRetry ? (
        <Pressable onPress={onRetry} style={styles.action} accessibilityRole="button">
          <Text style={styles.actionLabel}>{retryLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.dangerSoft,
    borderRadius: radius.md,
    borderLeftWidth: 3,
    borderLeftColor: colors.danger,
    padding: spacing.lg,
    gap: spacing.xs,
  },
  eyebrow: { ...typography.eyebrow, color: colors.danger },
  message: { ...typography.body, color: colors.ink },
  action: { paddingTop: spacing.sm },
  actionLabel: { ...typography.eyebrow, color: colors.danger },
});
