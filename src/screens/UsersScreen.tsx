import React, { useCallback } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { EmptyState } from '../components/EmptyState';
import { ErrorMessage } from '../components/ErrorMessage';
import { Loading } from '../components/Loading';
import { UserItem } from '../components/UserItem';
import { useAuth } from '../hooks/useAuth';
import { useContacts } from '../hooks/useContacts';
import { colors, roleColor, spacing, typography } from '../theme';
import { PROVIDER_LABEL, ROLE_LABEL } from '../utils/chatRules';
import type { RootStackParamList } from '../navigation/types';
import type { ChatUser } from '../types/user';

type Props = NativeStackScreenProps<RootStackParamList, 'Users'>;

export function UsersScreen({ navigation }: Props): React.JSX.Element {
  const { user, role, logout } = useAuth();
  const { contacts, loading, error } = useContacts(user);

  const handleSelect = useCallback(
    (contact: ChatUser) => {
      navigation.navigate('Chat', {
        otherUid: contact.uid,
        otherName: contact.name,
        otherProvider: contact.provider,
      });
    },
    [navigation],
  );

  const renderItem = useCallback(
    ({ item }: { item: ChatUser }) => <UserItem user={item} onSelect={handleSelect} />,
    [handleSelect],
  );

  const keyExtractor = useCallback((item: ChatUser) => item.uid, []);

  if (!user || !role) {
    return <Loading label="Preparando sessao" />;
  }

  const palette = roleColor[role];
  const opposite = role === 'seller'
    ? { singular: 'comprador', plural: 'compradores' }
    : { singular: 'vendedor', plural: 'vendedores' };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={[styles.role, { color: palette.strong }]}>{ROLE_LABEL[role]}</Text>
          <Text style={styles.name} numberOfLines={1}>
            {user.name}
          </Text>
          <Text style={styles.provider}>Entrou com {PROVIDER_LABEL[user.provider]}</Text>
        </View>
        <Pressable onPress={logout} accessibilityRole="button" style={styles.logout}>
          <Text style={styles.logoutLabel}>Sair</Text>
        </Pressable>
      </View>

      <Text style={styles.sectionTitle}>No balcao oposto</Text>

      {error ? (
        <View style={styles.errorWrapper}>
          <ErrorMessage message={error} />
        </View>
      ) : null}

      {loading ? (
        <Loading label="Buscando participantes" />
      ) : (
        <FlatList
          data={contacts}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={Separator}
          ListEmptyComponent={
            <EmptyState
              eyebrow="Balcao vazio"
              title={`Nenhum ${opposite.singular} por aqui`}
              description={`Voce so negocia com ${opposite.plural}. Peca para alguem entrar pelo outro lado: a lista atualiza sozinha.`}
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
    paddingTop: spacing.lg,
    paddingBottom: spacing.lg,
  },
  headerText: { flex: 1, gap: 2 },
  role: { ...typography.eyebrow },
  name: { ...typography.title, fontSize: 22, color: colors.ink },
  provider: { ...typography.caption, color: colors.muted },
  logout: { paddingVertical: spacing.sm, paddingHorizontal: spacing.md },
  logoutLabel: { ...typography.eyebrow, color: colors.muted },
  sectionTitle: {
    ...typography.eyebrow,
    color: colors.muted,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.md,
  },
  errorWrapper: { paddingHorizontal: spacing.xl, paddingBottom: spacing.md },
  list: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xxl },
  separator: { height: spacing.md },
});
