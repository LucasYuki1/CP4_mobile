import React, { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { Avatar } from '../components/Avatar';
import { ErrorMessage } from '../components/ErrorMessage';
import { Loading } from '../components/Loading';
import { PhotoPicker } from '../components/PhotoPicker';
import { useAuth } from '../hooks/useAuth';
import { profilePhotoPath, uploadImage } from '../services/storageService';
import { fetchProfile, updateOwnPhoto } from '../services/userService';
import { colors, radius, spacing, typography } from '../theme';
import { toUserMessage } from '../utils/errors';
import type { ChatUser } from '../types/user';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Profile'>;

const UNAVAILABLE = 'Nao informado';

function Field({ label, value }: { label: string; value: string }): React.JSX.Element {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <Text style={[styles.value, value.length === 0 ? styles.missing : null]}>
        {value.length > 0 ? value : UNAVAILABLE}
      </Text>
    </View>
  );
}

export function ProfileScreen({ route }: Props): React.JSX.Element {
  const { uid } = route.params;
  const { user, replaceUser } = useAuth();
  const isMe = user?.uid === uid;
  const [profile, setProfile] = useState<ChatUser | null>(isMe && user ? user : null);
  const [loading, setLoading] = useState<boolean>(!isMe);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState<boolean>(false);

  // O acesso e decidido pelas regras do Firestore ou, para grupos, pela API.
  useEffect(() => {
    if (isMe) return undefined;
    let active = true;
    setLoading(true);
    fetchProfile(uid)
      .then((result) => {
        if (!active) return;
        setProfile(result);
        if (!result) setError('Perfil nao encontrado.');
      })
      .catch((caught: unknown) => {
        if (active) setError(toUserMessage(caught, 'Nao foi possivel carregar o perfil.'));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [uid, isMe]);

  const handlePhoto = useCallback(
    async (localUri: string) => {
      if (!user) return;
      setUploading(true);
      setError(null);
      try {
        const photoUrl = await uploadImage(localUri, profilePhotoPath(user.uid));
        await updateOwnPhoto(user.uid, photoUrl);
        const next: ChatUser = { ...user, photoUrl };
        replaceUser(next);
        setProfile(next);
      } catch (caught) {
        setError(toUserMessage(caught, 'Nao foi possivel atualizar a foto.'));
      } finally {
        setUploading(false);
      }
    },
    [user, replaceUser],
  );

  if (loading) return <Loading label="Carregando perfil" />;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {error ? <ErrorMessage message={error} /> : null}
      {profile ? (
        <>
          <View style={styles.hero}>
            {isMe ? (
              <PhotoPicker uri={profile.photoUrl} name={profile.name} onPicked={handlePhoto} disabled={uploading} />
            ) : (
              <Avatar uri={profile.photoUrl} name={profile.name} size={112} />
            )}
            {uploading ? <Text style={styles.label}>Enviando foto...</Text> : null}
            <Text style={styles.name}>{profile.name}</Text>
          </View>
          <View style={styles.card}>
            <Field label="E-mail" value={profile.email} />
            <Field label="Celular" value={profile.phoneNumber} />
            <Field label="Data de nascimento" value={profile.birthDate} />
          </View>
        </>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.xl, gap: spacing.lg },
  hero: { alignItems: 'center', gap: spacing.md },
  name: { ...typography.title, color: colors.ink, textAlign: 'center' },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.hairline,
    padding: spacing.lg,
    gap: spacing.lg,
  },
  field: { gap: 2 },
  label: { ...typography.eyebrow, color: colors.muted },
  value: { ...typography.body, color: colors.ink },
  missing: { color: colors.muted, fontStyle: 'italic' },
});
