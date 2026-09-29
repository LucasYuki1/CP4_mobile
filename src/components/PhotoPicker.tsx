import React, { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Avatar } from './Avatar';
import { pickImageFromLibrary } from '../services/storageService';
import { colors, spacing, typography } from '../theme';
import { toUserMessage } from '../utils/errors';

export type PhotoPickerProps = {
  uri: string;
  name: string;
  variant?: 'person' | 'group';
  disabled?: boolean;
  onPicked: (localUri: string) => void;
};

export function PhotoPicker({
  uri,
  name,
  variant = 'person',
  disabled = false,
  onPicked,
}: PhotoPickerProps): React.JSX.Element {
  const [error, setError] = useState<string | null>(null);

  const handlePick = useCallback(async () => {
    setError(null);
    try {
      const picked = await pickImageFromLibrary();
      if (picked) onPicked(picked);
    } catch (pickError) {
      setError(toUserMessage(pickError, 'Nao foi possivel abrir a galeria.'));
    }
  }, [onPicked]);

  return (
    <View style={styles.container}>
      <Pressable
        onPress={handlePick}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel="Selecionar foto"
        style={styles.row}
      >
        <Avatar uri={uri} name={name.length > 0 ? name : '?'} size={72} variant={variant} />
        <Text style={styles.action}>{uri.length > 0 ? 'Trocar foto' : 'Selecionar foto'}</Text>
      </Pressable>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.xs },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  action: { ...typography.eyebrow, color: colors.ink },
  error: { ...typography.caption, color: colors.danger },
});
