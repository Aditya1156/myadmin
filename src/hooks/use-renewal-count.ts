'use client';

import { useState, useEffect } from 'react';

export function useRenewalCount() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    async function fetchCount() {
      try {
        const res = await fetch('/api/renewals/count');
        if (res.ok) {
          const json = await res.json();
          setCount(json.data?.count ?? 0);
        }
      } catch {
        // silent fail
      }
    }
    fetchCount();
    const interval = setInterval(fetchCount, 60000);
    return () => clearInterval(interval);
  }, []);

  return { count };
}
