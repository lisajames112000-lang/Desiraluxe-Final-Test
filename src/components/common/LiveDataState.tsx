import React from 'react';
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
    return <div role="status" aria-live="polite" aria-label={loadingLabel} className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-4">
      <span className="sr-only">{loadingLabel}</span>
      {Array.from({ length: 4 }, (_, index) => <div key={index} aria-hidden="true" className="overflow-hidden rounded-2xl border border-line bg-white p-3">
        <div className="aspect-square rounded-xl bg-sage" />
        <div className="mt-3 h-3 w-3/4 rounded bg-sage" />
        <div className="mt-2 h-3 w-1/2 rounded bg-sage" />
      </div>)}
    </div>;
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