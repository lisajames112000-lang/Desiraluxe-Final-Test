import React from 'react';
import { Center, Loader, Stack, Text } from '@mantine/core';
import type { PublicResourceStatus } from '../../types/backend';
import { EmptyState } from './EmptyState';

interface LiveDataStateProps {
  status: PublicResourceStatus;
  hasData: boolean;
  loadingLabel: string;
  emptyTitle: string;
  emptyDescription: string;
  actionLabel?: string;
  actionHref?: string;
  /** Optional layout-preserving empty view, used instead of the generic empty card. */
  emptyFallback?: React.ReactNode;
  children: React.ReactNode;
}

export function LiveDataState({
  status,
  hasData,
  loadingLabel,
  emptyTitle,
  emptyDescription,
  actionLabel,
  actionHref,
  emptyFallback,
  children
}: LiveDataStateProps) {
  if (hasData && ['loading', 'permission-denied', 'connection-error', 'error'].includes(status.state)) {
    return <>{children}</>;
  }
  if (status.state === 'loading') {
    return <Center mih={260} role="status" aria-live="polite"><Stack align="center"><Loader color="emerald" /><Text c="dimmed">{loadingLabel}</Text></Stack></Center>;
  }
  if (status.state === 'permission-denied') {
    return <EmptyState title="Published content is unavailable" description="Firestore denied this public read. The store owner must deploy the reviewed rules; drafts and private records remain protected." />;
  }
  if (status.state === 'connection-error') {
    return <EmptyState title="Could not connect to the catalog" description="The live store could not be reached. Check the connection and retry." />;
  }
  if (status.state === 'error') {
    return <EmptyState title="Live content could not be loaded" description="The store returned an unexpected read error. Review the sanitized operation details in the live data alert." />;
  }
  if (!hasData) {
    if (emptyFallback) return <>{emptyFallback}</>;
    return <EmptyState title={emptyTitle} description={emptyDescription} actionLabel={actionLabel} actionHref={actionHref} />;
  }
  return <>{children}</>;
}