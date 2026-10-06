import React, { memo, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, kindColor, radius, spacing, typography } from '../theme';
import type { ChatMessage, ConversationType } from '../types/chat';

export type ChatBubbleProps = {
  message: ChatMessage;
  isMine: boolean;
  conversationType: ConversationType;
  authorName: string;
  /** Rotulo "para Fulano" quando a mensagem de grupo e direcionada. */
  targetLabel: string | null;
  mentionsMe: boolean;
};

function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function ChatBubbleComponent({
  message,
  isMine,
  conversationType,
  authorName,
  targetLabel,
  mentionsMe,
}: ChatBubbleProps): React.JSX.Element {
  const time = useMemo(() => formatTime(message.createdAt), [message.createdAt]);
  const palette = kindColor[conversationType];

  return (
    <View style={[styles.row, isMine ? styles.rowMine : styles.rowTheirs]}>
      <View
        style={[
          styles.bubble,
          isMine
            ? styles.bubbleMine
            : [styles.bubbleTheirs, { backgroundColor: palette.soft, borderColor: palette.strong }],
          mentionsMe ? styles.mention : null,
        ]}
      >
        {!isMine && conversationType === 'group' ? (
          <Text style={[styles.author, { color: palette.strong }]}>{authorName}</Text>
        ) : null}
        {targetLabel ? (
          <Text style={[styles.target, isMine ? styles.textMine : null]}>{targetLabel}</Text>
        ) : null}
        <Text style={[styles.text, isMine ? styles.textMine : null]}>{message.text}</Text>
        <Text style={[styles.time, isMine ? styles.timeMine : null]}>{time}</Text>
      </View>
    </View>
  );
}

export const ChatBubble = memo(ChatBubbleComponent);

const styles = StyleSheet.create({
  row: { width: '100%', paddingHorizontal: spacing.lg, marginBottom: spacing.sm },
  rowMine: { alignItems: 'flex-end' },
  rowTheirs: { alignItems: 'flex-start' },
  bubble: {
    maxWidth: '82%',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: 2,
  },
  bubbleMine: {
    backgroundColor: colors.mine,
    borderColor: colors.mine,
    borderBottomRightRadius: radius.sm,
  },
  bubbleTheirs: { borderBottomLeftRadius: radius.sm },
  mention: { borderWidth: 2, borderColor: colors.warning },
  author: { ...typography.eyebrow, fontSize: 10 },
  target: { ...typography.caption, fontSize: 12, fontStyle: 'italic', color: colors.muted },
  text: { ...typography.body, color: colors.ink, lineHeight: 21 },
  textMine: { color: colors.mineText },
  time: { ...typography.caption, fontSize: 11, color: colors.muted, alignSelf: 'flex-end' },
  timeMine: { color: '#B9BDB5' },
});
