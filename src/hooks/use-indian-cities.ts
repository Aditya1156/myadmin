'use client';

import { useState, useEffect } from 'react';

export interface IndianCity {
  city: string;
  state: string;
}

let globalCache: IndianCity[] | null = null;

export function useIndianCities() {
  const [cities, setCities] = useState<IndianCity[]>(globalCache ?? []);
  const [loading, setLoading] = useState(!globalCache);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (globalCache) {
      setCities(globalCache);
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function fetchCities() {
      try {
        setLoading(true);
        const res = await fetch('/api/indian-cities');
        if (!res.ok) throw new Error('Failed to fetch cities');
        const json = await res.json();
        const data: IndianCity[] = json.data ?? [];

        if (!cancelled) {
          globalCache = data;
          setCities(data);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to fetch cities');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchCities();

    return () => {
      cancelled = true;
    };
  }, []);

  return { cities, loading, error };
}
