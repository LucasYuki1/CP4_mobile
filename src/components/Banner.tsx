import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, typography } from '../theme';

export type BannerProps = {
  message: string;
  actionLabel?: string;
  onAction?: () => void;
};

/** Aviso nao bloqueante (permissao de push negada, falha no envio do push etc.). */
export function Banner({ message, actionLabel, onAction }: BannerProps): React.JSX.Element {
  return (
    <View style={styles.container}>
      <Text style={styles.message}>{message}</Text>
      {actionLabel && onAction ? (
        <Pressable onPress={onAction} accessibilityRole="button">
          <Text style={styles.action}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.warningSoft,
    borderRadius: radius.md,
    borderLeftWidth: 3,
    borderLeftColor: colors.warning,
    padding: spacing.md,
    gap: spacing.xs,
  },
  message: { ...typography.caption, color: colors.ink, lineHeight: 19 },
  action: { ...typography.eyebrow, color: colors.warning },
});
