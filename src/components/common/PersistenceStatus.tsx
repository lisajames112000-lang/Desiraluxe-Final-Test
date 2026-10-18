import React, { useEffect, useState } from 'react';
import { Alert } from '@mantine/core';
import { CloudOffIcon, DatabaseBackupIcon, ShieldAlertIcon } from 'lucide-react';
import { useStore } from '../../contexts/StoreContext';
import { firebaseClient } from '../../services/firebase/client';
import type { FirestoreDiagnostic } from '../../types/backend';

function DiagnosticList({ diagnostics }: {diagnostics: FirestoreDiagnostic[];}) {
  const projectId = firebaseClient.app?.options.projectId ?? 'not initialized';
  const appIdSuffix = firebaseClient.app?.options.appId?.split(':').pop()?.slice(-6) ?? 'n/a';
  const codes = new Set(diagnostics.map((entry) => entry.code));
  const summary = codes.size === 1 && codes.has('permission-denied') ?
  'Every read was denied — including siteSettings/public, which the reviewed rules allow for everyone. The project is not running the reviewed firestore.rules.' :
  codes.size === 1 && codes.has('not-found') ?
  'The Firestore (default) database does not exist in this project.' :
  codes.has('failed-precondition') ?
  'At least one composite index is missing. Deploy firestore.indexes.json.' :
  null;
  return (
    <details className="mt-2 text-xs">
      <summary className="cursor-pointer font-semibold">Show sanitized diagnostics</summary>
      <p className="mt-2">Project: {projectId} · Database: (default) · Web app …{appIdSuffix} · Config source: {firebaseClient.configurationSource}</p>
      {summary && <p className="mt-1 font-semibold">{summary}</p>}
      <ul className="mt-2 space-y-1">
        {diagnostics.map((entry) =>
        <li key={entry.path} className="break-words font-mono">
            {entry.code} · {entry.operation} {entry.path} · where {entry.filters.length ? entry.filters.join(' AND ') : 'none'} · orderBy {entry.orderBy.length ? entry.orderBy.join(', ') : 'none'} · auth {entry.authentication}
          </li>
        )}
      </ul>
    </details>);

}

export function PersistenceStatus() {
  const { backendStatus, cartNotice, dismissCartNotice } = useStore();
  const [storageFailed, setStorageFailed] = useState(false);
  useEffect(() => {const failure = () => setStorageFailed(true);window.addEventListener('desiraluxe-storage-error', failure);return () => window.removeEventListener('desiraluxe-storage-error', failure);}, []);
  const backendProblem = ['offline', 'error', 'cached'].includes(backendStatus.state);
  const demoMode = backendStatus.state === 'demo';
  // Normal background initialization is not an error or a blocking popup.
  if (!storageFailed && !backendProblem && !demoMode && !cartNotice) return null;
  return (
    <div className="fixed bottom-4 left-4 right-4 z-[1000] mx-auto max-w-xl space-y-2" aria-live="polite">
      {demoMode && <Alert color="yellow" radius="lg" variant="filled" icon={<ShieldAlertIcon size={18} />} title="Legacy Preview — shared saving is disabled">{backendStatus.message}</Alert>}
      {backendProblem &&
      <Alert color={backendStatus.state === 'error' ? 'red' : 'yellow'} radius="lg" variant="filled" icon={<CloudOffIcon size={18} />} title={backendStatus.state === 'offline' ? 'You are offline' : 'Live data connection'} role="alert">
          <span className="break-words">{backendStatus.message}</span>
          {backendStatus.diagnostics && backendStatus.diagnostics.length > 0 && <DiagnosticList diagnostics={backendStatus.diagnostics} />}
        </Alert>
      }
      {storageFailed && <Alert color="red" radius="lg" variant="filled" icon={<DatabaseBackupIcon size={18} />} withCloseButton closeButtonLabel="Dismiss cart storage warning" onClose={() => setStorageFailed(false)} title="Cart draft could not be saved">Browser storage is unavailable or full. Business data is unaffected, but this device may lose its cart draft.</Alert>}
      {cartNotice && <Alert color="blue" radius="lg" withCloseButton closeButtonLabel="Dismiss cart update" onClose={dismissCartNotice} title="Cart updated">{cartNotice}</Alert>}
    </div>);

}