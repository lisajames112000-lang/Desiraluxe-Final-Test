import { FieldValue, type Firestore, type Transaction } from 'firebase-admin/firestore';
import { managedMediaIdFromUrl } from '../cloudinary/server.js';

export function managedMediaId(url: string): string | null {
  return managedMediaIdFromUrl(url);
}

export async function syncMediaReferences(
db: Firestore,
transaction: Transaction,
reference: string,
previousUrls: string[],
nextUrls: string[])
: Promise<void> {
  const previousIds = new Set(previousUrls.map(managedMediaId).filter((id): id is string => !!id));
  const nextEntries = nextUrls.map((url) => ({ url, id: managedMediaId(url) })).filter((entry): entry is {url: string;id: string;} => !!entry.id);
  const allIds = Array.from(new Set([...previousIds, ...nextEntries.map((entry) => entry.id)]));
  if (!allIds.length) return;
  const snapshots = await transaction.getAll(...allIds.map((id) => db.collection('media').doc(id)));
  const byId = new Map(snapshots.map((snapshot) => [snapshot.id, snapshot]));

  nextEntries.forEach(({ id, url }) => {
    const snapshot = byId.get(id);
    if (!snapshot?.exists || snapshot.data()?.status !== 'ready' || snapshot.data()?.url !== url) throw new Error('MEDIA_NOT_READY');
  });

  allIds.forEach((id) => {
    const snapshot = byId.get(id);
    if (!snapshot?.exists) return;
    const wasReferenced = previousIds.has(id);
    const isReferenced = nextEntries.some((entry) => entry.id === id);
    if (!wasReferenced && isReferenced) transaction.update(snapshot.ref, { references: FieldValue.arrayUnion(reference), updatedAt: FieldValue.serverTimestamp() });
    if (wasReferenced && !isReferenced) transaction.update(snapshot.ref, { references: FieldValue.arrayRemove(reference), updatedAt: FieldValue.serverTimestamp() });
  });
}

export function contentMediaUrls(resource: string, value: Record<string, unknown> | undefined): string[] {
  if (!value) return [];
  if (resource === 'categories') return typeof value.image === 'string' && value.image ? [value.image] : [];
  if (resource === 'heroSlides') return [value.image, value.mobileImage].filter((entry): entry is string => typeof entry === 'string' && !!entry);
  if (resource === 'popups') return typeof value.image === 'string' && value.image ? [value.image] : [];
  if (resource === 'paymentMethodsPublic') return typeof value.qrImage === 'string' && value.qrImage ? [value.qrImage] : [];
  return [];
}