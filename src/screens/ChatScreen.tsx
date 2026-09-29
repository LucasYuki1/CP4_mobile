import React, { useCallback, useLayoutEffect, useMemo } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { Avatar } from '../components/Avatar';
import { Banner } from '../components/Banner';
import { ChatBubble } from '../components/ChatBubble';
import { ChatInput, type MentionCandidate } from '../components/ChatInput';
import { EmptyState } from '../components/EmptyState';
import { ErrorMessage } from '../components/ErrorMessage';
import { Loading } from '../components/Loading';
import { useAuth } from '../hooks/useAuth';
import { useChat } from '../hooks/useChat';
import { useGroup } from '../hooks/useGroups';
import { usePublicProfiles } from '../hooks/usePublicProfiles';
import { colors, kindColor, spacing, typography } from '../theme';
import { otherParticipant } from '../utils/conversationId';
import type { ChatMessage } from '../types/chat';
import type { ChatUser } from '../types/user';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Chat'>;

export function ChatScreen(props: Props): React.JSX.Element {
  const { user } = useAuth();
  if (!user) return <Loading label="Preparando conversa" />;
  return <ChatContent {...props} user={user} />;
}

function ChatContent({ route, navigation, user }: Props & { user: ChatUser }): React.JSX.Element {
  const { conversationId, conversationType } = route.params;
  const isGroup = conversationType === 'group';
  const { byId } = usePublicProfiles();
  const { group, revoked } = useGroup(isGroup ? conversationId : undefined, user.uid);
  const { messages, loading, error, pushWarning, sending, send, dismissError } = useChat(
    conversationId,
    conversationType,
    user.uid,
  );

  const otherUid = useMemo(
    () => (isGroup ? null : otherParticipant(conversationId, user.uid)),
    [isGroup, conversationId, user.uid],
  );

  const nameOf = useCallback(
    (uid: string): string => (uid === user.uid ? 'Voce' : (byId.get(uid)?.name ?? 'Usuario')),
    [byId, user.uid],
  );

  const header = useMemo(() => {
    if (isGroup) {
      return {
        title: group?.name ?? 'Grupo',
        photoUrl: group?.photoUrl ?? '',
        subtitle: group ? `${group.memberIds.length} integrantes · toque para ver` : '',
      };
    }
    const profile = otherUid ? byId.get(otherUid) : undefined;
    return { title: profile?.name ?? 'Conversa', photoUrl: profile?.photoUrl ?? '', subtitle: 'Ver perfil' };
  }, [isGroup, group, otherUid, byId]);

  // Tocar na foto: perfil do outro participante ou lista de integrantes do grupo.
  const openDetails = useCallback(() => {
    if (isGroup) navigation.navigate('GroupMembers', { groupId: conversationId });
    else if (otherUid) navigation.navigate('Profile', { uid: otherUid });
  }, [isGroup, navigation, conversationId, otherUid]);

  const openSettings = useCallback(
    () => navigation.navigate('GroupForm', { groupId: conversationId }),
    [navigation, conversationId],
  );

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: () => (
        <Pressable onPress={openDetails} style={styles.headerTitle} accessibilityRole="button">
          <Avatar
            uri={header.photoUrl}
            name={header.title}
            size={34}
            variant={isGroup ? 'group' : 'person'}
          />
          <View>
            <Text style={styles.headerName} numberOfLines={1}>
              {header.title}
            </Text>
            {header.subtitle ? <Text style={styles.headerSub}>{header.subtitle}</Text> : null}
          </View>
        </Pressable>
      ),
      headerRight: isGroup
        ? () => (
            <Pressable onPress={openSettings} accessibilityRole="button" style={styles.settings}>
              <Text style={styles.settingsLabel}>Grupo</Text>
            </Pressable>
          )
        : () => null,
    });
  }, [navigation, header, isGroup, openDetails, openSettings]);

  const candidates = useMemo<MentionCandidate[]>(
    () =>
      group
        ? group.memberIds
            .filter((uid) => uid !== user.uid)
            .map((uid) => ({ uid, name: byId.get(uid)?.name ?? 'Usuario' }))
        : [],
    [group, user.uid, byId],
  );

  const renderItem = useCallback(
    ({ item }: { item: ChatMessage }) => {
      const isMine = item.senderId === user.uid;
      let targetLabel: string | null = null;
      if (isGroup && item.target.type === 'member') {
        targetLabel = `para ${nameOf(item.target.memberId)}`;
      } else if (isGroup && item.mentionedUserIds.length > 0) {
        targetLabel = `mencionou ${item.mentionedUserIds.map(nameOf).join(', ')}`;
      }
      const mentionsMe =
        isGroup &&
        !isMine &&
        (item.mentionedUserIds.includes(user.uid) ||
          (item.target.type === 'member' && item.target.memberId === user.uid));
      return (
        <ChatBubble
          message={item}
          isMine={isMine}
          conversationType={conversationType}
          authorName={nameOf(item.senderId)}
          targetLabel={targetLabel}
          mentionsMe={mentionsMe}
        />
      );
    },
    [user.uid, isGroup, nameOf, conversationType],
  );

  const keyExtractor = useCallback((item: ChatMessage) => item.id, []);

  // Lista invertida: a mensagem mais recente fica visivel sem controlar o scroll.
  const inverted = useMemo(() => [...messages].reverse(), [messages]);
  const palette = kindColor[conversationType];
  const blocked = isGroup && revoked;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 96 : 0}
    >
      <View style={[styles.strip, { backgroundColor: palette.strong }]} />

      {blocked ? (
        <View style={styles.notice}>
          <ErrorMessage message="Voce nao participa mais deste grupo e nao recebe novas mensagens." />
        </View>
      ) : null}
      {error && !blocked ? (
        <View style={styles.notice}>
          <ErrorMessage message={error} onRetry={dismissError} retryLabel="Entendi" />
        </View>
      ) : null}
      {pushWarning ? (
        <View style={styles.notice}>
          <Banner message={pushWarning} actionLabel="Ok" onAction={dismissError} />
        </View>
      ) : null}

      {loading ? (
        <Loading label="Abrindo conversa" />
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
              eyebrow="Sem mensagens"
              title="A conversa comeca aqui"
              description="Envie a primeira mensagem. Ela aparece para os outros na hora, sem atualizar a tela."
            />
          }
        />
      )}

      <ChatInput
        onSend={send}
        sending={sending}
        disabled={blocked}
        candidates={candidates}
        {...(otherUid ? { directRecipientId: otherUid } : {})}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.canvas },
  strip: { height: 3 },
  headerTitle: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, maxWidth: 240 },
  headerName: { ...typography.subtitle, color: colors.ink },
  headerSub: { ...typography.caption, fontSize: 11, color: colors.muted },
  settings: { paddingHorizontal: spacing.sm, paddingVertical: spacing.xs },
  settingsLabel: { ...typography.eyebrow, color: colors.group },
  notice: { paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  list: { paddingVertical: spacing.lg, flexGrow: 1 },
});
