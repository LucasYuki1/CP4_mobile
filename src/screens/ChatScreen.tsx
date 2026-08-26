import React, { useCallback, useLayoutEffect, useMemo } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { ChatBubble } from '../components/ChatBubble';
import { ChatInput } from '../components/ChatInput';
import { EmptyState } from '../components/EmptyState';
import { ErrorMessage } from '../components/ErrorMessage';
import { Loading } from '../components/Loading';
import { useAuth } from '../hooks/useAuth';
import { useChat } from '../hooks/useChat';
import { colors, roleColor, spacing, typography } from '../theme';
import { PROVIDER_LABEL, ROLE_LABEL, roleOf } from '../utils/chatRules';
import type { RootStackParamList } from '../navigation/types';
import type { ChatMessage } from '../types/chat';

type Props = NativeStackScreenProps<RootStackParamList, 'Chat'>;

export function ChatScreen({ route, navigation }: Props): React.JSX.Element {
  const { otherUid, otherName, otherProvider } = route.params;
  const { user } = useAuth();

  const otherRole = useMemo(() => roleOf(otherProvider), [otherProvider]);
  const myRole = useMemo(() => (user ? roleOf(user.provider) : null), [user]);

  useLayoutEffect(() => {
    navigation.setOptions({ title: otherName });
  }, [navigation, otherName]);

  const { messages, loading, error, sending, send, dismissError } = useChat(
    user?.uid ?? '',
    otherUid,
  );

  const renderItem = useCallback(
    ({ item }: { item: ChatMessage }) => {
      const isMine = item.senderId === user?.uid;
      const senderRole = isMine && myRole ? myRole : otherRole;
      return <ChatBubble message={item} isMine={isMine} senderRole={senderRole} />;
    },
    [user?.uid, myRole, otherRole],
  );

  const keyExtractor = useCallback((item: ChatMessage) => item.id, []);

  // FlatList invertida: a mensagem mais recente fica sempre visivel,
  // sem precisar controlar scroll manualmente a cada evento do listener.
  const inverted = useMemo(() => [...messages].reverse(), [messages]);

  if (!user || !myRole) {
    return <Loading label="Preparando conversa" />;
  }

  const palette = roleColor[otherRole];

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 96 : 0}
    >
      <View style={[styles.header, { borderLeftColor: palette.strong }]}>
        <Text style={[styles.role, { color: palette.strong }]}>{ROLE_LABEL[otherRole]}</Text>
        <Text style={styles.name}>{otherName}</Text>
        <Text style={styles.provider}>Entrou com {PROVIDER_LABEL[otherProvider]}</Text>
      </View>

      {error ? (
        <View style={styles.errorWrapper}>
          <ErrorMessage message={error} onRetry={dismissError} retryLabel="Entendi" />
        </View>
      ) : null}

      {loading ? (
        <Loading label="Abrindo negociacao" />
      ) : (
        <FlatList
          data={inverted}
          inverted={inverted.length > 0}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          contentContainerStyle={styles.list}
          keyboardDismissMode="interactive"
          ListEmptyComponent={
            <EmptyState
              eyebrow="Sem propostas"
              title="A negociacao comeca aqui"
              description="Envie a primeira mensagem. O outro lado recebe na hora, sem precisar atualizar a tela."
            />
          }
        />
      )}

      <ChatInput onSend={send} sending={sending} />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.canvas },
  header: {
    backgroundColor: colors.surface,
    borderLeftWidth: 4,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.hairline,
    gap: 2,
  },
  role: { ...typography.eyebrow },
  name: { ...typography.subtitle, color: colors.ink },
  provider: { ...typography.caption, color: colors.muted },
  errorWrapper: { padding: spacing.lg },
  list: { paddingVertical: spacing.lg, flexGrow: 1 },
});
