import { collection, onSnapshot, type Firestore, type Unsubscribe } from 'firebase/firestore';

function adminReadError(path: string, error: unknown): string {
  const code = typeof error === 'object' && error && 'code' in error ? String(error.code) : '';
  if (code.includes('permission-denied')) return `Admin access to ${path} was denied. Refresh the admin custom claim and verify deployed Firestore rules.`;
  if (code.includes('failed-precondition')) return `Admin ${path} requires a missing Firestore index. Deploy firestore.indexes.json.`;
  if (code.includes('unavailable')) return `Admin ${path} is temporarily unavailable. Check the network and Firebase status.`;
  return `Admin ${path} data could not be loaded.`;
}

export function subscribeAdminCollection<T>(db: Firestore, path: string, onData: (data: T[]) => void, onError: (message: string) => void): Unsubscribe {
  return onSnapshot(collection(db, path), { includeMetadataChanges: true }, (snapshot) => onData(snapshot.docs.map((entry) => entry.data() as T)), (error) => onError(adminReadError(path, error)));
}