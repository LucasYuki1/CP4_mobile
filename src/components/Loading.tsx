import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { colors, spacing, typography } from '../theme';

export type LoadingProps = {
  label?: string;
  compact?: boolean;
};

export function Loading({ label = 'Carregando', compact = false }: LoadingProps): React.JSX.Element {
  return (
    <View style={[styles.container, compact && styles.compact]}>
      <ActivityIndicator color={colors.ink} />
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    backgroundColor: colors.canvas,
  },
  compact: { flex: 0, paddingVertical: spacing.xl },
  label: { ...typography.eyebrow, color: colors.muted },
});
