import { useEffect, useMemo, useState } from 'react';

import { listenToPublicProfiles } from '../services/userService';
import type { PublicProfile } from '../types/user';

export type UsePublicProfilesResult = {
  profiles: PublicProfile[];
  byId: ReadonlyMap<string, PublicProfile>;
  loading: boolean;
  error: string | null;
};

/** Cartoes publicos (nome e foto) em tempo real, indexados por uid. */
export function usePublicProfiles(enabled = true): UsePublicProfilesResult {
  const [profiles, setProfiles] = useState<PublicProfile[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) return undefined;
    setLoading(true);
    return listenToPublicProfiles(
      (items) => {
        setProfiles(items);
        setError(null);
        setLoading(false);
      },
      () => {
        setError('Nao foi possivel carregar os usuarios. Verifique sua conexao.');
        setLoading(false);
      },
    );
  }, [enabled]);

  const byId = useMemo<ReadonlyMap<string, PublicProfile>>(
    () => new Map(profiles.map((profile) => [profile.uid, profile])),
    [profiles],
  );

  return { profiles, byId, loading, error };
}
