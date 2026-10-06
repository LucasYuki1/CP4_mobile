import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, typography } from '../theme';
import { NOTIFICATION_POLICIES, type NotificationPolicy } from '../types/notification';
import { POLICY_DESCRIPTION, POLICY_LABEL } from '../utils/groupValidation';

export type PolicySelectorProps = {
  value: NotificationPolicy;
  onChange: (policy: NotificationPolicy) => void;
  disabled?: boolean;
};

export function PolicySelector({ value, onChange, disabled = false }: PolicySelectorProps): React.JSX.Element {
  return (
    <View style={styles.container} accessibilityRole="radiogroup">
      {NOTIFICATION_POLICIES.map((policy) => {
        const active = policy === value;
        return (
          <Pressable
            key={policy}
            onPress={() => onChange(policy)}
            disabled={disabled}
            accessibilityRole="radio"
            accessibilityState={{ checked: active, disabled }}
            style={[styles.option, active ? styles.active : null, disabled ? styles.disabled : null]}
          >
            <Text style={[styles.label, active ? styles.labelActive : null]}>{POLICY_LABEL[policy]}</Text>
            <Text style={styles.description}>{POLICY_DESCRIPTION[policy]}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.sm },
  option: {
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.hairline,
    backgroundColor: colors.surface,
    gap: 2,
  },
  active: { borderColor: colors.group, backgroundColor: colors.groupSoft },
  disabled: { opacity: 0.6 },
  label: { ...typography.body, fontWeight: '600', color: colors.ink },
  labelActive: { color: colors.group },
  description: { ...typography.caption, color: colors.muted },
});
