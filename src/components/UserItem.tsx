import React, { memo, useCallback } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Avatar } from './Avatar';
import { colors, radius, spacing, typography } from '../theme';
import type { PublicProfile } from '../types/user';

export type UserItemProps = {
  profile: PublicProfile;
  onPress: (profile: PublicProfile) => void;
  /** Modo de selecao de integrantes: mostra a caixa de marcacao. */
  selected?: boolean;
  disabled?: boolean;
  caption?: string;
};

function UserItemComponent({
  profile,
  onPress,
  selected,
  disabled = false,
  caption,
}: UserItemProps): React.JSX.Element {
  const handlePress = useCallback(() => onPress(profile), [onPress, profile]);
  const selectable = selected !== undefined;

  return (
    <Pressable
      onPress={handlePress}
      disabled={disabled}
      accessibilityRole={selectable ? 'checkbox' : 'button'}
      accessibilityState={selectable ? { checked: selected, disabled } : { disabled }}
      style={({ pressed }) => [
        styles.card,
        selected ? styles.selected : null,
        disabled ? styles.disabled : null,
        pressed ? styles.pressed : null,
      ]}
    >
      <Avatar uri={profile.photoUrl} name={profile.name} />
      <View style={styles.content}>
        <Text style={styles.name} numberOfLines={1}>
          {profile.name}
        </Text>
        {caption ? <Text style={styles.caption}>{caption}</Text> : null}
      </View>
      {selectable ? (
        <View style={[styles.box, selected ? styles.boxOn : null]}>
          {selected ? <Text style={styles.check}>✓</Text> : null}
        </View>
      ) : null}
    </Pressable>
  );
}

export const UserItem = memo(UserItemComponent);

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.hairline,
    padding: spacing.md,
  },
  selected: { borderColor: colors.group, backgroundColor: colors.groupSoft },
  disabled: { opacity: 0.45 },
  pressed: { opacity: 0.9 },
  content: { flex: 1, gap: 2 },
  name: { ...typography.subtitle, color: colors.ink },
  caption: { ...typography.caption, color: colors.muted },
  box: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.hairline,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxOn: { borderColor: colors.group, backgroundColor: colors.group },
  check: { color: colors.surface, fontWeight: '700' },
});
