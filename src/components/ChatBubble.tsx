import React, { memo, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, radius, roleColor, spacing, typography } from '../theme';
import { ROLE_LABEL } from '../utils/chatRules';
import type { ChatMessage } from '../types/chat';
import type { MarketRole } from '../types/user';

export type ChatBubbleProps = {
  message: ChatMessage;
  isMine: boolean;
  senderRole: MarketRole;
};

function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * A cor do balao vem do papel de quem enviou, nao de "minha/sua".
 * Vendedor sempre jade, comprador sempre cobalto. O alinhamento continua
 * separando enviada (direita) de recebida (esquerda).
 */
function ChatBubbleComponent({ message, isMine, senderRole }: ChatBubbleProps): React.JSX.Element {
  const palette = roleColor[senderRole];
  const time = useMemo(() => formatTime(message.createdAt), [message.createdAt]);

  return (
    <View style={[styles.row, isMine ? styles.rowMine : styles.rowTheirs]}>
      <View
        style={[
          styles.bubble,
          isMine ? styles.bubbleMine : styles.bubbleTheirs,
          { backgroundColor: palette.soft, borderColor: palette.strong },
        ]}
      >
        {!isMine ? (
          <Text style={[styles.author, { color: palette.strong }]}>{ROLE_LABEL[senderRole]}</Text>
        ) : null}
        <Text style={styles.text}>{message.text}</Text>
        <Text style={styles.time}>{time}</Text>
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
  bubbleMine: { borderBottomRightRadius: radius.sm },
  bubbleTheirs: { borderBottomLeftRadius: radius.sm },
  author: { ...typography.eyebrow, fontSize: 10 },
  text: { ...typography.body, color: colors.ink, lineHeight: 21 },
  time: { ...typography.caption, fontSize: 11, color: colors.muted, alignSelf: 'flex-end' },
});
