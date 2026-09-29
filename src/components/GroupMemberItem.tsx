import React, { memo, useCallback } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Avatar } from './Avatar';
import { colors, radius, spacing, typography } from '../theme';

export type GroupMemberItemProps = {
  uid: string;
  name: string;
  photoUrl: string;
  isOwner: boolean;
  isMe: boolean;
  onOpenProfile: (uid: string) => void;
  /** Presente apenas quando o usuario atual e o proprietario. */
  onRemove?: (uid: string) => void;
  removing?: boolean;
};

function GroupMemberItemComponent({
  uid,
  name,
  photoUrl,
  isOwner,
  isMe,
  onOpenProfile,
  onRemove,
  removing = false,
}: GroupMemberItemProps): React.JSX.Element {
  const handleOpen = useCallback(() => onOpenProfile(uid), [onOpenProfile, uid]);
  const handleRemove = useCallback(() => onRemove?.(uid), [onRemove, uid]);

  return (
    <View style={styles.row}>
      <Pressable
        onPress={handleOpen}
        style={styles.identity}
        accessibilityRole="button"
        accessibilityLabel={`Ver perfil de ${name}`}
      >
        <Avatar uri={photoUrl} name={name} size={40} />
        <View style={styles.text}>
          <Text style={styles.name} numberOfLines={1}>
            {name}
            {isMe ? ' (voce)' : ''}
          </Text>
          {isOwner ? <Text style={styles.owner}>Proprietario</Text> : null}
        </View>
      </Pressable>
      {onRemove && !isOwner ? (
        <Pressable
          onPress={handleRemove}
          disabled={removing}
          accessibilityRole="button"
          accessibilityLabel={`Remover ${name}`}
          style={styles.remove}
        >
          <Text style={styles.removeLabel}>{removing ? '...' : 'Remover'}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export const GroupMemberItem = memo(GroupMemberItemComponent);

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.hairline,
    padding: spacing.md,
  },
  identity: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  text: { flex: 1, gap: 2 },
  name: { ...typography.body, fontWeight: '600', color: colors.ink },
  owner: { ...typography.eyebrow, color: colors.group },
  remove: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  removeLabel: { ...typography.eyebrow, color: colors.danger },
});
