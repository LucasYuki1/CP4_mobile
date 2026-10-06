import React, { memo, useEffect, useMemo, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

import { colors } from '../theme';

export type AvatarProps = {
  uri: string;
  name: string;
  size?: number;
  variant?: 'person' | 'group';
};

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter((part) => part.length > 0);
  const first = parts[0]?.[0] ?? '?';
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : '';
  return `${first}${last}`.toUpperCase();
}

/**
 * Foto do usuario ou do grupo. Sem URL, ou se a imagem falhar ao carregar,
 * mostra a imagem padrao (iniciais sobre fundo neutro).
 */
function AvatarComponent({ uri, name, size = 44, variant = 'person' }: AvatarProps): React.JSX.Element {
  const [failed, setFailed] = useState<boolean>(false);
  useEffect(() => setFailed(false), [uri]);

  const initials = useMemo(() => initialsOf(name), [name]);
  const dimension = { width: size, height: size, borderRadius: variant === 'group' ? size * 0.3 : size / 2 };
  const showImage = uri.length > 0 && !failed;

  return (
    <View
      style={[styles.base, dimension, variant === 'group' ? styles.group : styles.person]}
      accessibilityLabel={`Foto de ${name}`}
    >
      {showImage ? (
        <Image source={{ uri }} style={dimension} onError={() => setFailed(true)} />
      ) : (
        <Text style={[styles.initials, { fontSize: size * 0.36 }]}>{initials}</Text>
      )}
    </View>
  );
}

export const Avatar = memo(AvatarComponent);

const styles = StyleSheet.create({
  base: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  person: { backgroundColor: colors.directSoft },
  group: { backgroundColor: colors.groupSoft },
  initials: { fontWeight: '700', color: colors.ink },
});
