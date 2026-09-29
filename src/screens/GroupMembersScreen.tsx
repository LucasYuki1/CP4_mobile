import React, { useCallback, useMemo } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { Avatar } from '../components/Avatar';
import { EmptyState } from '../components/EmptyState';
import { ErrorMessage } from '../components/ErrorMessage';
import { GroupMemberItem } from '../components/GroupMemberItem';
import { Loading } from '../components/Loading';
import { useAuth } from '../hooks/useAuth';
import { useGroup } from '../hooks/useGroups';
import { usePublicProfiles } from '../hooks/usePublicProfiles';
import { colors, spacing, typography } from '../theme';
import { POLICY_LABEL } from '../utils/groupValidation';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'GroupMembers'>;

export function GroupMembersScreen({ route, navigation }: Props): React.JSX.Element {
  const { user } = useAuth();
  const uid = user?.uid ?? '';
  const { group, loading, error, revoked, slotsLeft } = useGroup(route.params.groupId, uid);
  const { byId } = usePublicProfiles();

  const members = useMemo<string[]>(() => {
    if (!group) return [];
    return [...group.memberIds].sort((a, b) =>
      a === group.ownerId ? -1 : b === group.ownerId ? 1 : 0,
    );
  }, [group]);

  const openProfile = useCallback(
    (memberId: string) => navigation.navigate('Profile', { uid: memberId }),
    [navigation],
  );

  const renderItem = useCallback(
    ({ item }: { item: string }) => (
      <GroupMemberItem
        uid={item}
        name={byId.get(item)?.name ?? 'Usuario'}
        photoUrl={byId.get(item)?.photoUrl ?? ''}
        isOwner={item === group?.ownerId}
        isMe={item === uid}
        onOpenProfile={openProfile}
      />
    ),
    [byId, group?.ownerId, uid, openProfile],
  );

  if (loading) return <Loading label="Carregando integrantes" />;
  if (revoked || !group) {
    return (
      <EmptyState
        eyebrow="Acesso encerrado"
        title="Voce nao participa deste grupo"
        description="Somente integrantes ativos podem ver a lista."
      />
    );
  }

  return (
    <FlatList
      data={members}
      keyExtractor={(item) => item}
      renderItem={renderItem}
      contentContainerStyle={styles.list}
      ItemSeparatorComponent={Separator}
      ListHeaderComponent={
        <View style={styles.header}>
          <Avatar uri={group.photoUrl} name={group.name} size={96} variant="group" />
          <Text style={styles.title}>{group.name}</Text>
          <Text style={styles.caption}>
            {group.memberIds.length}/{group.memberLimit} integrantes · {slotsLeft} vaga(s)
          </Text>
          <Text style={styles.caption}>Notificacoes: {POLICY_LABEL[group.notificationPolicy]}</Text>
          {error ? <ErrorMessage message={error} /> : null}
        </View>
      }
    />
  );
}

function Separator(): React.JSX.Element {
  return <View style={styles.separator} />;
}

const styles = StyleSheet.create({
  list: { padding: spacing.xl },
  header: { alignItems: 'center', gap: spacing.sm, marginBottom: spacing.xl },
  title: { ...typography.title, fontSize: 22, color: colors.ink },
  caption: { ...typography.caption, color: colors.muted },
  separator: { height: spacing.md },
});
