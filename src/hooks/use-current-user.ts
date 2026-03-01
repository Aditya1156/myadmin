'use client';

import { useState, useEffect } from 'react';
import type { User } from '@prisma/client';

export function useCurrentUser() {
  const [dbUser, setDbUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchUser() {
      try {
        const res = await fetch('/api/users/sync', { method: 'POST' });
        if (res.ok) {
          const json = await res.json();
          setDbUser(json.data);
        }
      } catch {
        // silent fail
      } finally {
        setLoading(false);
      }
    }
    fetchUser();
  }, []);

  return { dbUser, loading };
}
