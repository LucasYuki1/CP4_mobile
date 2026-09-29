import React, { useCallback, useMemo, useState } from 'react';
import { FlatList, StyleSheet, Text, TextInput, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { EmptyState } from '../components/EmptyState';
import { ErrorMessage } from '../components/ErrorMessage';
import { Loading } from '../components/Loading';
import { PrimaryButton } from '../components/PrimaryButton';
import { UserItem } from '../components/UserItem';
import { useAuth } from '../hooks/useAuth';
import { usePublicProfiles } from '../hooks/usePublicProfiles';
import { ensureDirectConversation } from '../services/chatService';
import { colors, radius, spacing, typography } from '../theme';
import { toUserMessage } from '../utils/errors';
import type { PublicProfile } from '../types/user';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Users'>;

export function UsersScreen({ navigation, route }: Props): React.JSX.Element {
  const params = route.params;
  const { user } = useAuth();
  const { profiles, loading, error } = usePublicProfiles();
  const [search, setSearch] = useState<string>('');
  const [opening, setOpening] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string[]>(
    params.mode === 'pickMembers' ? params.selectedIds : [],
  );

  const locked = useMemo<ReadonlySet<string>>(
    () => new Set(params.mode === 'pickMembers' ? params.lockedIds : []),
    [params],
  );
  const maxSelectable = params.mode === 'pickMembers' ? params.maxSelectable : 0;
  const slotsLeft = Math.max(maxSelectable - selected.length, 0);

  // O proprio usuario nunca aparece: nao e possivel conversar consigo mesmo.
  const filtered = useMemo<PublicProfile[]>(() => {
    const term = search.trim().toLocaleLowerCase('pt-BR');
    return profiles
      .filter((profile) => profile.uid !== user?.uid)
      .filter((profile) => term.length === 0 || profile.nameLower.includes(term))
      .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  }, [profiles, search, user?.uid]);

  const startConversation = useCallback(
    async (profile: PublicProfile) => {
      if (!user || opening) return;
      setOpening(profile.uid);
      setActionError(null);
      try {
        const conversation = await ensureDirectConversation(user.uid, profile.uid);
        navigation.replace('Chat', { conversationId: conversation.id, conversationType: 'direct' });
      } catch (caught) {
        setActionError(toUserMessage(caught, 'Nao foi possivel iniciar a conversa.'));
      } finally {
        setOpening(null);
      }
    },
    [user, opening, navigation],
  );

  const toggleMember = useCallback(
    (profile: PublicProfile) => {
      if (selected.includes(profile.uid)) {
        setActionError(null);
        setSelected(selected.filter((uid) => uid !== profile.uid));
        return;
      }
      if (selected.length >= maxSelectable) {
        setActionError('O limite de integrantes do grupo foi atingido.');
        return;
      }
      setActionError(null);
      setSelected([...selected, profile.uid]);
    },
    [selected, maxSelectable],
  );

  const confirmSelection = useCallback(() => {
    if (params.mode !== 'pickMembers') return;
    navigation.popTo('GroupForm', {
      ...(params.groupId ? { groupId: params.groupId } : {}),
      pickedMemberIds: selected,
    });
  }, [navigation, params, selected]);

  const renderItem = useCallback(
    ({ item }: { item: PublicProfile }) => {
      if (params.mode === 'direct') {
        return (
          <UserItem
            profile={item}
            onPress={startConversation}
            disabled={opening !== null}
            {...(opening === item.uid ? { caption: 'Abrindo conversa...' } : {})}
          />
        );
      }
      const isLocked = locked.has(item.uid);
      return (
        <UserItem
          profile={item}
          onPress={toggleMember}
          selected={isLocked || selected.includes(item.uid)}
          disabled={isLocked}
          {...(isLocked ? { caption: 'Ja faz parte do grupo' } : {})}
        />
      );
    },
    [params.mode, startConversation, opening, locked, selected, toggleMember],
  );

  const keyExtractor = useCallback((item: PublicProfile) => item.uid, []);

  if (loading) return <Loading label="Buscando usuarios" />;

  return (
    <View style={styles.container}>
      <View style={styles.top}>
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Buscar por nome"
          placeholderTextColor={colors.muted}
          style={styles.search}
          accessibilityLabel="Buscar usuarios"
        />
        {params.mode === 'pickMembers' ? (
          <Text style={styles.slots}>
            {selected.length} selecionado(s) · {slotsLeft} vaga(s) disponivel(is)
          </Text>
        ) : null}
        {error ? <ErrorMessage message={error} /> : null}
        {actionError ? <ErrorMessage message={actionError} /> : null}
      </View>

      <FlatList
        data={filtered}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={Separator}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          <EmptyState
            eyebrow="Sem resultados"
            title={search.length > 0 ? 'Nenhum usuario encontrado' : 'Nenhum outro usuario cadastrado'}
            description="A lista atualiza sozinha quando alguem cria uma conta."
          />
        }
      />

      {params.mode === 'pickMembers' ? (
        <View style={styles.footer}>
          <PrimaryButton label="Confirmar integrantes" onPress={confirmSelection} />
        </View>
      ) : null}
    </View>
  );
}

function Separator(): React.JSX.Element {
  return <View style={styles.separator} />;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.canvas },
  top: { padding: spacing.xl, paddingBottom: spacing.md, gap: spacing.md },
  search: {
    height: 48,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.hairline,
    ...typography.body,
    color: colors.ink,
  },
  slots: { ...typography.caption, color: colors.group },
  list: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xxl, flexGrow: 1 },
  separator: { height: spacing.md },
  footer: { padding: spacing.xl, borderTopWidth: 1, borderTopColor: colors.hairline },
});
