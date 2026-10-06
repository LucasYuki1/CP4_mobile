import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { EmptyState } from '../components/EmptyState';
import { ErrorMessage } from '../components/ErrorMessage';
import { FormField } from '../components/FormField';
import { GroupMemberItem } from '../components/GroupMemberItem';
import { Loading } from '../components/Loading';
import { PhotoPicker } from '../components/PhotoPicker';
import { PolicySelector } from '../components/PolicySelector';
import { PrimaryButton } from '../components/PrimaryButton';
import { useAuth } from '../hooks/useAuth';
import { useGroup } from '../hooks/useGroups';
import { usePublicProfiles } from '../hooks/usePublicProfiles';
import {
  addMembers,
  createGroup,
  leaveGroup,
  removeMember,
  updateGroupPhoto,
  updateGroupSettings,
} from '../services/groupService';
import { colors, radius, spacing, typography } from '../theme';
import { toUserMessage } from '../utils/errors';
import {
  availableSlots,
  MAX_GROUP_LIMIT,
  parseMemberLimit,
  POLICY_LABEL,
  validateGroupName,
  validateMemberLimit,
  validateMembers,
} from '../utils/groupValidation';
import type { NotificationPolicy } from '../types/notification';
import type { ChatUser } from '../types/user';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'GroupForm'>;
type ContentProps = Props & { user: ChatUser };

export function GroupFormScreen(props: Props): React.JSX.Element {
  const { user } = useAuth();
  if (!user) return <Loading label="Preparando sessao" />;
  return props.route.params.groupId ? (
    <EditGroup {...props} user={user} groupId={props.route.params.groupId} />
  ) : (
    <CreateGroup {...props} user={user} />
  );
}

function SlotsInfo({ count, limit }: { count: number; limit: number | null }): React.JSX.Element {
  const slots = limit === null ? null : availableSlots(count, limit);
  return (
    <View style={styles.slots}>
      <Text style={styles.slotsText}>
        {count} integrante(s), incluindo o proprietario
        {slots === null ? '' : ` · ${slots} vaga(s) disponivel(is)`}
      </Text>
      {slots === 0 ? <Text style={styles.full}>Grupo sem vagas</Text> : null}
    </View>
  );
}

function CreateGroup({ navigation, route, user }: ContentProps): React.JSX.Element {
  const { byId } = usePublicProfiles();
  const [name, setName] = useState<string>('');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [memberIds, setMemberIds] = useState<string[]>([]);
  const [limitText, setLimitText] = useState<string>('5');
  const [policy, setPolicy] = useState<NotificationPolicy>('all_group_messages');
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Integrantes escolhidos na tela de Usuarios voltam pelos parametros da rota.
  const picked = route.params.pickedMemberIds;
  useEffect(() => {
    if (picked) setMemberIds(picked);
  }, [picked]);

  const limit = useMemo(() => parseMemberLimit(limitText), [limitText]);
  const totalMembers = memberIds.length + 1;

  const validationError = useMemo<string | null>(() => {
    const checks = [
      validateGroupName(name),
      validateMemberLimit(limit, totalMembers),
      validateMembers([user.uid, ...memberIds], limit ?? 0),
    ];
    const failed = checks.find((check) => !check.valid);
    return failed && !failed.valid ? failed.message : null;
  }, [name, limit, totalMembers, memberIds, user.uid]);

  const pickMembers = useCallback(() => {
    const effectiveLimit = limit !== null && limit >= 2 ? limit : MAX_GROUP_LIMIT;
    navigation.navigate('Users', {
      mode: 'pickMembers',
      lockedIds: [],
      selectedIds: memberIds,
      maxSelectable: Math.min(effectiveLimit, MAX_GROUP_LIMIT) - 1,
    });
  }, [navigation, limit, memberIds]);

  const removeLocal = useCallback(
    (uid: string) => setMemberIds((previous) => previous.filter((item) => item !== uid)),
    [],
  );
  const openProfile = useCallback((uid: string) => navigation.navigate('Profile', { uid }), [navigation]);

  const handleCreate = useCallback(async () => {
    if (validationError || limit === null) {
      setError(validationError ?? 'Informe o limite de integrantes.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const groupId = await createGroup(user.uid, {
        name,
        memberIds,
        memberLimit: limit,
        notificationPolicy: policy,
        photoUri,
      });
      navigation.replace('Chat', { conversationId: groupId, conversationType: 'group' });
    } catch (caught) {
      setError(toUserMessage(caught, 'Nao foi possivel criar o grupo.'));
      setSaving(false);
    }
  }, [validationError, limit, user.uid, name, memberIds, policy, photoUri, navigation]);

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <PhotoPicker uri={photoUri ?? ''} name={name} variant="group" onPicked={setPhotoUri} />
        <FormField label="Nome do grupo" value={name} onChangeText={setName} maxLength={60} />
        <FormField
          label="Limite de integrantes"
          value={limitText}
          onChangeText={setLimitText}
          keyboardType="number-pad"
          hint={`Inteiro entre 2 e ${MAX_GROUP_LIMIT}, contando o proprietario.`}
        />

        <Text style={styles.section}>Integrantes</Text>
        <SlotsInfo count={totalMembers} limit={limit} />
        <GroupMemberItem
          uid={user.uid}
          name={user.name}
          photoUrl={user.photoUrl}
          isOwner
          isMe
          onOpenProfile={openProfile}
        />
        {memberIds.map((uid) => (
          <GroupMemberItem
            key={uid}
            uid={uid}
            name={byId.get(uid)?.name ?? 'Usuario'}
            photoUrl={byId.get(uid)?.photoUrl ?? ''}
            isOwner={false}
            isMe={false}
            onOpenProfile={openProfile}
            onRemove={removeLocal}
          />
        ))}
        <PrimaryButton label="Selecionar integrantes" onPress={pickMembers} variant="outline" />

        <Text style={styles.section}>Notificacoes push</Text>
        <PolicySelector value={policy} onChange={setPolicy} />

        {error ? <ErrorMessage message={error} /> : null}
        <PrimaryButton label="Criar grupo" onPress={handleCreate} loading={saving} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function EditGroup({ navigation, route, user, groupId }: ContentProps & { groupId: string }): React.JSX.Element {
  const { group, loading, error: loadError, revoked, isOwner, slotsLeft } = useGroup(groupId, user.uid);
  const { byId } = usePublicProfiles();
  const [name, setName] = useState<string>('');
  const [limitText, setLimitText] = useState<string>('');
  const [policy, setPolicy] = useState<NotificationPolicy>('all_group_messages');
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const initializedRef = useRef<boolean>(false);
  const handledPickRef = useRef<string[] | undefined>(undefined);

  // Preenche o formulario uma unica vez, com os dados atuais do Firestore.
  useEffect(() => {
    if (!group || initializedRef.current) return;
    initializedRef.current = true;
    setName(group.name);
    setLimitText(String(group.memberLimit));
    setPolicy(group.notificationPolicy);
  }, [group]);

  const run = useCallback(async (key: string, action: () => Promise<void>, success: string) => {
    setBusy(key);
    setError(null);
    setNotice(null);
    try {
      await action();
      setNotice(success);
    } catch (caught) {
      setError(toUserMessage(caught, 'Nao foi possivel atualizar o grupo.'));
    } finally {
      setBusy(null);
    }
  }, []);

  // Novos integrantes escolhidos na tela de Usuarios.
  const picked = route.params.pickedMemberIds;
  useEffect(() => {
    if (!picked || picked === handledPickRef.current || picked.length === 0) return;
    handledPickRef.current = picked;
    void run('add', () => addMembers(groupId, user.uid, picked), 'Integrantes adicionados.');
  }, [picked, groupId, user.uid, run]);

  const limit = useMemo(() => parseMemberLimit(limitText), [limitText]);
  const memberCount = group?.memberIds.length ?? 0;

  const sortedMembers = useMemo<string[]>(() => {
    if (!group) return [];
    return [...group.memberIds].sort((a, b) => {
      if (a === group.ownerId) return -1;
      if (b === group.ownerId) return 1;
      return (byId.get(a)?.name ?? '').localeCompare(byId.get(b)?.name ?? '', 'pt-BR');
    });
  }, [group, byId]);

  const openProfile = useCallback((uid: string) => navigation.navigate('Profile', { uid }), [navigation]);

  const handleSave = useCallback(() => {
    const limitCheck = validateMemberLimit(limit, memberCount);
    if (!limitCheck.valid || limit === null) {
      setError(limitCheck.valid ? 'Informe o limite.' : limitCheck.message);
      return;
    }
    void run(
      'save',
      () => updateGroupSettings(groupId, user.uid, { name, memberLimit: limit, notificationPolicy: policy }),
      'Configuracoes salvas.',
    );
  }, [limit, memberCount, run, groupId, user.uid, name, policy]);

  const handleRemove = useCallback(
    (uid: string) => void run(`remove-${uid}`, () => removeMember(groupId, user.uid, uid), 'Integrante removido.'),
    [run, groupId, user.uid],
  );

  const handlePhoto = useCallback(
    (uri: string) => void run('photo', () => updateGroupPhoto(groupId, uri), 'Foto atualizada.'),
    [run, groupId],
  );

  const handleAdd = useCallback(() => {
    if (!group) return;
    if (slotsLeft === 0) {
      setError('O grupo atingiu o limite de integrantes. Aumente o limite para adicionar alguem.');
      return;
    }
    navigation.navigate('Users', {
      mode: 'pickMembers',
      groupId,
      lockedIds: group.memberIds,
      selectedIds: [],
      maxSelectable: slotsLeft,
    });
  }, [group, slotsLeft, navigation, groupId]);

  const handleLeave = useCallback(async () => {
    setBusy('leave');
    setError(null);
    try {
      await leaveGroup(groupId, user.uid);
      navigation.popToTop();
    } catch (caught) {
      setError(toUserMessage(caught, 'Nao foi possivel sair do grupo.'));
      setBusy(null);
    }
  }, [groupId, user.uid, navigation]);

  if (loading) return <Loading label="Carregando grupo" />;
  if (revoked || !group) {
    return (
      <EmptyState
        eyebrow="Acesso encerrado"
        title="Voce nao participa deste grupo"
        description="Somente integrantes ativos podem ver e gerenciar o grupo."
      />
    );
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        {loadError ? <ErrorMessage message={loadError} /> : null}
        <PhotoPicker
          uri={group.photoUrl}
          name={group.name}
          variant="group"
          onPicked={handlePhoto}
          disabled={!isOwner || busy !== null}
        />
        {isOwner ? (
          <>
            <FormField label="Nome do grupo" value={name} onChangeText={setName} maxLength={60} />
            <FormField
              label="Limite de integrantes"
              value={limitText}
              onChangeText={setLimitText}
              keyboardType="number-pad"
              hint={`Minimo ${Math.max(memberCount, 2)} (integrantes atuais), maximo ${MAX_GROUP_LIMIT}.`}
            />
            <Text style={styles.section}>Notificacoes push</Text>
            <PolicySelector value={policy} onChange={setPolicy} />
            <PrimaryButton label="Salvar configuracoes" onPress={handleSave} loading={busy === 'save'} />
          </>
        ) : (
          <View style={styles.readOnly}>
            <Text style={styles.title}>{group.name}</Text>
            <Text style={styles.caption}>
              Politica de notificacao: {POLICY_LABEL[group.notificationPolicy]}
            </Text>
            <Text style={styles.caption}>Somente o proprietario pode alterar o grupo.</Text>
          </View>
        )}

        {notice ? <Text style={styles.notice}>{notice}</Text> : null}
        {error ? <ErrorMessage message={error} /> : null}

        <Text style={styles.section}>Integrantes (limite {group.memberLimit})</Text>
        <SlotsInfo count={memberCount} limit={group.memberLimit} />
        {sortedMembers.map((uid) => (
          <GroupMemberItem
            key={uid}
            uid={uid}
            name={uid === user.uid ? user.name : (byId.get(uid)?.name ?? 'Usuario')}
            photoUrl={uid === user.uid ? user.photoUrl : (byId.get(uid)?.photoUrl ?? '')}
            isOwner={uid === group.ownerId}
            isMe={uid === user.uid}
            onOpenProfile={openProfile}
            {...(isOwner ? { onRemove: handleRemove } : {})}
            removing={busy === `remove-${uid}`}
          />
        ))}
        {isOwner ? (
          <PrimaryButton
            label={slotsLeft === 0 ? 'Grupo sem vagas' : 'Adicionar integrantes'}
            onPress={handleAdd}
            variant="outline"
            disabled={slotsLeft === 0}
            loading={busy === 'add'}
          />
        ) : (
          <PrimaryButton label="Sair do grupo" onPress={handleLeave} variant="outline" loading={busy === 'leave'} />
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.canvas },
  container: { padding: spacing.xl, gap: spacing.md, paddingBottom: spacing.xxl },
  section: { ...typography.eyebrow, color: colors.muted, marginTop: spacing.md },
  slots: {
    backgroundColor: colors.groupSoft,
    borderRadius: radius.sm,
    padding: spacing.md,
    gap: 2,
  },
  slotsText: { ...typography.caption, color: colors.group },
  full: { ...typography.eyebrow, color: colors.danger },
  readOnly: { gap: spacing.xs },
  title: { ...typography.title, fontSize: 22, color: colors.ink },
  caption: { ...typography.caption, color: colors.muted },
  notice: { ...typography.caption, color: colors.direct },
});
