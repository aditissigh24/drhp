"use client"

import React from 'react';
import { Workspace } from '@/app/layout/Workspace/Workspace';
import WatchlistTab from './WatchlistTab';

/**
 * Upstream has two tabs here, "Watchlist" and "Live". The Live tab filters to
 * companies with an in-flight ingestion pipeline; there is no pipeline in this
 * app, so it would always be empty and is dropped.
 */
export default function WatchlistPage() {
  const tabs = React.useMemo(
    () => [{ id: 'watchlist', label: 'Watchlist', content: <WatchlistTab /> }],
    [],
  );
  return <Workspace tabs={tabs} />;
}
