import React, { memo, useCallback } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Avatar } from './Avatar';
import { colors, kindColor, radius, spacing, typography } from '../theme';
import { availableSlots } from '../utils/groupValidation';
import type { ConversationSummary } from '../types/chat';

export type ConversationItemProps = {
  conversation: ConversationSummary;
  onSelect: (conversation: ConversationSummary) => void;
};

function ConversationItemComponent({ conversation, onSelect }: ConversationItemProps): React.JSX.Element {
  const palette = kindColor[conversation.kind];
  const handlePress = useCallback(() => onSelect(conversation), [onSelect, conversation]);
  const detail =
    conversation.kind === 'group'
      ? `${conversation.memberCount}/${conversation.memberLimit} integrantes · ${availableSlots(
          conversation.memberCount,
          conversation.memberLimit,
        )} vaga(s)`
      : 'Conversa individual';

  return (
    <Pressable
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel={`Abrir ${conversation.kind === 'group' ? 'grupo' : 'conversa com'} ${conversation.title}`}
      style={({ pressed }) => [styles.card, pressed ? styles.pressed : null]}
    >
      <View style={[styles.stripe, { backgroundColor: palette.strong }]} />
      <Avatar
        uri={conversation.photoUrl}
        name={conversation.title}
        variant={conversation.kind === 'group' ? 'group' : 'person'}
      />
      <View style={styles.content}>
        <Text style={[styles.kind, { color: palette.strong }]}>
          {conversation.kind === 'group' ? 'Grupo' : 'Individual'}
        </Text>
        <Text style={styles.title} numberOfLines={1}>
          {conversation.title}
        </Text>
        <Text style={styles.detail} numberOfLines={1}>
          {detail}
        </Text>
      </View>
    </Pressable>
  );
}

export const ConversationItem = memo(ConversationItemComponent);

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.hairline,
    paddingRight: spacing.lg,
  },
  pressed: { opacity: 0.9 },
  stripe: { width: 6, alignSelf: 'stretch' },
  content: { flex: 1, paddingVertical: spacing.md, gap: 2 },
  kind: { ...typography.eyebrow },
  title: { ...typography.subtitle, color: colors.ink },
  detail: { ...typography.caption, color: colors.muted },
});
