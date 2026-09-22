'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * The app opens on the watchlist. A client-side replace rather than next/navigation's
 * server `redirect()`, because `output: 'export'` emits static HTML with no server
 * to issue a 3xx.
 */
export default function Page() {
  const router = useRouter();
  useEffect(() => { router.replace('/watchlist'); }, [router]);
  return null;
}
