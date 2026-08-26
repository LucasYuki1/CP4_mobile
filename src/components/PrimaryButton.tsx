import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, type ViewStyle } from 'react-native';

import { colors, radius, spacing, typography } from '../theme';

export type PrimaryButtonProps = {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: 'solid' | 'outline';
  style?: ViewStyle;
};

export function PrimaryButton({
  label,
  onPress,
  loading = false,
  disabled = false,
  variant = 'solid',
  style,
}: PrimaryButtonProps): React.JSX.Element {
  const isBlocked = disabled || loading;
  return (
    <Pressable
      onPress={onPress}
      disabled={isBlocked}
      accessibilityRole="button"
      accessibilityState={{ disabled: isBlocked, busy: loading }}
      style={({ pressed }) => [
        styles.base,
        variant === 'solid' ? styles.solid : styles.outline,
        pressed && !isBlocked ? styles.pressed : null,
        isBlocked ? styles.blocked : null,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'solid' ? colors.surface : colors.ink} />
      ) : (
        <Text style={[styles.label, variant === 'solid' ? styles.labelSolid : styles.labelOutline]}>
          {label}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    height: 52,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  solid: { backgroundColor: colors.ink },
  outline: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.hairline },
  pressed: { opacity: 0.85 },
  blocked: { opacity: 0.5 },
  label: { ...typography.eyebrow },
  labelSolid: { color: colors.surface },
  labelOutline: { color: colors.ink },
});
