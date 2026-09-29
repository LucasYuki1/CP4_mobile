import React from 'react';
import { StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';

import { colors, radius, spacing, typography } from '../theme';

export type FormFieldProps = Omit<TextInputProps, 'style'> & {
  label: string;
  hint?: string;
};

export function FormField({ label, hint, ...inputProps }: FormFieldProps): React.JSX.Element {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <TextInput placeholderTextColor={colors.muted} style={styles.input} {...inputProps} />
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.xs },
  label: { ...typography.eyebrow, color: colors.muted },
  input: {
    height: 50,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.hairline,
    ...typography.body,
    color: colors.ink,
  },
  hint: { ...typography.caption, color: colors.muted },
});
