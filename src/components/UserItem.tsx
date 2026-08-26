import React, { useCallback } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, roleColor, spacing, typography } from '../theme';
import { PROVIDER_LABEL, ROLE_HINT, ROLE_LABEL, roleOf } from '../utils/chatRules';
import type { ChatUser } from '../types/user';

export type UserItemProps = {
  user: ChatUser;
  onSelect: (user: ChatUser) => void;
};

/**
 * Etiqueta de balcao: a faixa lateral colorida e o rotulo em caixa alta
 * dizem, de relance, de que lado do marketplace a pessoa esta.
 */
export function UserItem({ user, onSelect }: UserItemProps): React.JSX.Element {
  const role = roleOf(user.provider);
  const palette = roleColor[role];

  const handlePress = useCallback(() => onSelect(user), [onSelect, user]);

  return (
    <Pressable
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel={`Negociar com ${user.name}, ${ROLE_LABEL[role]}`}
      style={({ pressed }) => [styles.card, pressed ? styles.pressed : null]}
    >
      <View style={[styles.stripe, { backgroundColor: palette.strong }]} />
      <View style={styles.content}>
        <Text style={[styles.role, { color: palette.strong }]}>{ROLE_LABEL[role]}</Text>
        <Text style={styles.name} numberOfLines={1}>
          {user.name}
        </Text>
        <Text style={styles.hint} numberOfLines={1}>
          {ROLE_HINT[role]} · entrou com {PROVIDER_LABEL[user.provider]}
        </Text>
      </View>
      <View style={[styles.punch, { borderColor: palette.strong }]} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.hairline,
  },
  pressed: { opacity: 0.9 },
  stripe: { width: 6, alignSelf: 'stretch' },
  content: { flex: 1, paddingVertical: spacing.lg, paddingHorizontal: spacing.lg, gap: 2 },
  role: { ...typography.eyebrow },
  name: { ...typography.subtitle, color: colors.ink },
  hint: { ...typography.caption, color: colors.muted },
  punch: {
    width: 14,
    height: 14,
    borderRadius: radius.pill,
    borderWidth: 2,
    marginRight: spacing.lg,
  },
});
