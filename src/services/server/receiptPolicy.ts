import { createHash } from 'node:crypto';
export const RECEIPT_MAX_BYTES = 5 * 1024 * 1024;
export const receiptTypes = ['image/jpeg','image/png','image/webp'];
export const receiptOwner = (token: string) => createHash('sha256').update(token).digest('hex');
export function validReceiptFile(type: string, size: number) {return receiptTypes.includes(type) && Number.isSafeInteger(size) && size > 0 && size <= RECEIPT_MAX_BYTES;}
export function receiptBelongsToCheckout(proof: Record<string, unknown> | undefined, token: string) {return !!proof && proof.status === 'ready' && proof.ownerHash === receiptOwner(token) && !proof.orderId && Number(proof.expiresAtMs) > Date.now() && validReceiptFile(String(proof.contentType),Number(proof.size));}
