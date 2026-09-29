import React, { useCallback, useContext, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { Avatar } from '../components/Avatar';
import { Banner } from '../components/Banner';
import { ConversationItem } from '../components/ConversationItem';
import { EmptyState } from '../components/EmptyState';
import { ErrorMessage } from '../components/ErrorMessage';
import { Loading } from '../components/Loading';
import { PrimaryButton } from '../components/PrimaryButton';
import { PushStatusContext } from '../contexts/PushStatusContext';
import { useAuth } from '../hooks/useAuth';
import { useConversations } from '../hooks/useConversations';
import { colors, spacing, typography } from '../theme';
import { toUserMessage } from '../utils/errors';
import type { ChatUser } from '../types/user';
import type { ConversationSummary } from '../types/chat';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Conversations'>;

export function ConversationsScreen(props: Props): React.JSX.Element {
  const { user } = useAuth();
  if (!user) return <Loading label="Preparando sessao" />;
  return <ConversationsContent {...props} user={user} />;
}

function ConversationsContent({ navigation, user }: Props & { user: ChatUser }): React.JSX.Element {
  const { logout } = useAuth();
  const push = useContext(PushStatusContext);
  const { conversations, loading, error } = useConversations(user.uid);
  const [logoutError, setLogoutError] = useState<string | null>(null);

  const handleSelect = useCallback(
    (conversation: ConversationSummary) => {
      navigation.navigate('Chat', { conversationId: conversation.id, conversationType: conversation.kind });
    },
    [navigation],
  );

  const handleLogout = useCallback(async () => {
    setLogoutError(null);
    try {
      await logout();
    } catch (caught) {
      setLogoutError(toUserMessage(caught, 'Nao foi possivel sair. Tente novamente.'));
    }
  }, [logout]);

  const openNewDirect = useCallback(() => navigation.navigate('Users', { mode: 'direct' }), [navigation]);
  const openNewGroup = useCallback(() => navigation.navigate('GroupForm', {}), [navigation]);
  const openMyProfile = useCallback(
    () => navigation.navigate('Profile', { uid: user.uid }),
    [navigation, user.uid],
  );

  const renderItem = useCallback(
    ({ item }: { item: ConversationSummary }) => (
      <ConversationItem conversation={item} onSelect={handleSelect} />
    ),
    [handleSelect],
  );
  const keyExtractor = useCallback((item: ConversationSummary) => `${item.kind}-${item.id}`, []);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={openMyProfile} accessibilityRole="button" accessibilityLabel="Meu perfil">
          <Avatar uri={user.photoUrl} name={user.name} size={48} />
        </Pressable>
        <View style={styles.headerText}>
          <Text style={styles.eyebrow}>Conversas</Text>
          <Text style={styles.name} numberOfLines={1}>
            {user.name}
          </Text>
        </View>
        <Pressable onPress={handleLogout} accessibilityRole="button" style={styles.logout}>
          <Text style={styles.logoutLabel}>Sair</Text>
        </Pressable>
      </View>

      <View style={styles.section}>
        {push.message ? (
          <Banner message={push.message} actionLabel="Tentar de novo" onAction={push.retry} />
        ) : null}
        {logoutError ? <ErrorMessage message={logoutError} /> : null}
        {error ? <ErrorMessage message={error} /> : null}
        <View style={styles.actions}>
          <PrimaryButton label="Nova conversa" onPress={openNewDirect} style={styles.action} />
          <PrimaryButton label="Novo grupo" onPress={openNewGroup} variant="outline" style={styles.action} />
        </View>
      </View>

      {loading ? (
        <Loading label="Carregando conversas" />
      ) : (
        <FlatList
          data={conversations}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={Separator}
          ListEmptyComponent={
            <EmptyState
              eyebrow="Nada por aqui"
              title="Nenhuma conversa ainda"
              description="Toque em Nova conversa para falar com alguem ou crie um grupo."
            />
          }
        />
      )}
    </View>
  );
}

function Separator(): React.JSX.Element {
  return <View style={styles.separator} />;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.canvas },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
  },
  headerText: { flex: 1, gap: 2 },
  eyebrow: { ...typography.eyebrow, color: colors.muted },
  name: { ...typography.title, fontSize: 22, color: colors.ink },
  logout: { paddingVertical: spacing.sm, paddingHorizontal: spacing.md },
  logoutLabel: { ...typography.eyebrow, color: colors.danger },
  section: { paddingHorizontal: spacing.xl, gap: spacing.md, paddingBottom: spacing.md },
  actions: { flexDirection: 'row', gap: spacing.md },
  action: { flex: 1 },
  list: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xxl, flexGrow: 1 },
  separator: { height: spacing.md },
});
