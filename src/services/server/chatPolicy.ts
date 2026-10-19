import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';
import type { VercelRequest } from '../../types/vercel.js';

export const CHAT_LIMITS = { bodyBytes: 16384, text: 4000, attachments: 3, messages: 2000, uploadLifetimeMs: 3600000, downloadSeconds: 300 } as const;
const clean = (max: number) => z.string().trim().min(1).max(max).refine(value => !/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value));
const id = z.string().regex(/^[a-f0-9]{32}$/);
const token = z.string().regex(/^[a-f0-9]{64}$/);
const auth = { threadId: id, token: token.optional() };
export const chatSettingsSchema = z.object({ enabled: z.boolean(), agentName: clean(60), welcomeMessage: clean(1000), whatsappNumber: z.string().regex(/^\+?[0-9]{7,15}$|^$/) }).strict();
export const DEFAULT_CHAT_SETTINGS = { enabled: true, agentName: 'Desira Luxe Support', welcomeMessage: 'Welcome! How can I help you today?', whatsappNumber: '' };
export type ChatSettings = z.infer<typeof chatSettingsSchema>;
export function safeSettings(value: unknown): ChatSettings { const result = chatSettingsSchema.safeParse(value); return result.success ? result.data : { ...DEFAULT_CHAT_SETTINGS }; }
export const chatRequestSchema = z.discriminatedUnion('action', [
 z.object({ action: z.literal('settings') }).strict(),
 z.object({ action: z.literal('admin-save'), settings: chatSettingsSchema }).strict(),
 z.object({ action: z.literal('start'), name: clean(80), phone: z.string().trim().regex(/^\+?[0-9 ()-]{7,24}$/), topic: z.enum(['general', 'order']).default('general'), orderReference: clean(100).optional(), orderAccessToken: z.string().min(32).max(200).optional() }).strict(),
 z.object({ action: z.literal('read'), ...auth, before: z.number().int().positive().max(CHAT_LIMITS.messages + 1).optional(), limit: z.number().int().min(1).max(50).default(50) }).strict(),
 z.object({ action: z.literal('send'), ...auth, text: z.string().trim().max(CHAT_LIMITS.text).default(''), attachmentIds: z.array(id).max(CHAT_LIMITS.attachments).default([]), clientMessageId: z.string().regex(/^[a-zA-Z0-9_-]{8,80}$/) }).strict(),
 z.object({ action: z.literal('admin-list'), limit: z.number().int().min(1).max(100).default(50), before: z.number().int().positive().max(8640000000000000).optional() }).strict(),
 z.object({ action: z.literal('admin-update'), threadId: id, status: z.enum(['open','closed']).optional(), agentName: clean(60).optional() }).strict(),
 z.object({ action: z.literal('sign-upload'), ...auth, fileName: clean(180), contentType: z.string().max(100), size: z.number().int().positive().max(25 * 1024 * 1024) }).strict(),
 z.object({ action: z.literal('complete-upload'), ...auth, mediaId: id, publicId: z.string().max(300), version: z.number().int().positive().safe(), signature: z.string().regex(/^[a-f0-9]{40}$|^[a-f0-9]{64}$/i) }).strict()
]);
export type ChatRequest = z.infer<typeof chatRequestSchema>;
export function newChatToken(): string { return randomBytes(32).toString('hex'); }
export function tokenHash(value: string): string { return createHash('sha256').update(value).digest('hex'); }
export function ownsChat(hash: unknown, candidate: unknown): boolean {
 if (typeof hash !== 'string' || !/^[a-f0-9]{64}$/.test(hash) || typeof candidate !== 'string' || !/^[a-f0-9]{64}$/.test(candidate)) return false;
 return timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(tokenHash(candidate), 'hex'));
}
export function sameOrigin(request: VercelRequest): boolean {
 const origin = request.headers.origin; const host = request.headers.host;
 if (!origin || !host || request.headers['sec-fetch-site'] && request.headers['sec-fetch-site'] !== 'same-origin') return false;
 const forwardedProto = request.headers['x-forwarded-proto'];
 const protocol = typeof forwardedProto === 'string' ? forwardedProto.split(',')[0].trim() : (host.startsWith('localhost:') || host.startsWith('127.0.0.1:') ? 'http' : 'https');
 try { const parsed = new URL(origin); return parsed.origin === protocol + '://' + host && !parsed.username && !parsed.password; } catch { return false; }
}
export interface FilePolicy { kind: 'image'|'video'|'document'; resourceType: 'image'|'video'|'raw'; format: string; maxBytes: number; }
const FILES: Record<string, { format: string; extensions: string[]; kind: FilePolicy['kind'] }> = {
 'image/jpeg': {format:'jpg',extensions:['jpg','jpeg'],kind:'image'}, 'image/png': {format:'png',extensions:['png'],kind:'image'}, 'image/webp': {format:'webp',extensions:['webp'],kind:'image'},
 'video/mp4': {format:'mp4',extensions:['mp4'],kind:'video'}, 'video/webm': {format:'webm',extensions:['webm'],kind:'video'},
 'application/pdf': {format:'pdf',extensions:['pdf'],kind:'document'}, 'application/msword': {format:'doc',extensions:['doc'],kind:'document'},
 'application/vnd.openxmlformats-officedocument.wordprocessingml.document': {format:'docx',extensions:['docx'],kind:'document'},
 'application/vnd.ms-excel': {format:'xls',extensions:['xls'],kind:'document'}, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': {format:'xlsx',extensions:['xlsx'],kind:'document'},
 'text/plain': {format:'txt',extensions:['txt'],kind:'document'}
};
export function filePolicy(contentType: string, fileName: string, size: number): FilePolicy | null {
 const item = FILES[contentType]; const extension = fileName.split('.').pop()?.toLowerCase();
 if (!item || !extension || !item.extensions.includes(extension) || /[\/\\\u0000-\u001f\u007f]/.test(fileName) || fileName.length > 180 || !Number.isSafeInteger(size) || size <= 0) return null;
 const maxBytes = (item.kind === 'video' ? 25 : 10) * 1024 * 1024;
 return size <= maxBytes ? { kind:item.kind, resourceType:item.kind === 'document' ? 'raw' : item.kind, format:item.format, maxBytes } : null;
}
export function uploadBelongsToActor(media: Record<string, unknown> | undefined, threadId: string, actorKey: string, now = Date.now()): boolean {
 return !!media && media.threadId === threadId && media.actorKey === actorKey && media.status === 'ready' && !media.messageId && typeof media.expiresAt === 'number' && media.expiresAt > now;
}
export function validStoredMedia(media: Record<string, unknown>, asset: {publicId:string;resourceType:string;deliveryType:string;version:number;format:string;bytes:number}, version: number): boolean {
 const policy = filePolicy(String(media.contentType), String(media.fileName), Number(media.expectedSize));
 return !!policy && asset.publicId === media.publicId && asset.resourceType === policy.resourceType && asset.deliveryType === 'authenticated' && asset.version === version && asset.bytes === media.expectedSize && asset.bytes <= policy.maxBytes && (policy.resourceType === 'raw' ? asset.publicId.endsWith('.' + policy.format) && (!asset.format || asset.format === policy.format) : asset.format === policy.format);
}
// Raw formats are not MIME-sniffed by Cloudinary. Validate bounded original
// bytes server-side, never a browser-supplied MIME assertion. Not a malware scan.
export function validDocumentBytes(format: string, bytes: Buffer): boolean {
 if (format === 'pdf') return bytes.subarray(0,5).toString('ascii') === '%PDF-';
 if (format === 'txt') { try { const value = new TextDecoder('utf-8', {fatal:true}).decode(bytes); return !/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value); } catch { return false; } }
 if (format === 'doc' || format === 'xls') {
  if (bytes.subarray(0,8).toString('hex') !== 'd0cf11e0a1b11ae1') return false;
  return bytes.includes(Buffer.from(format === 'doc' ? 'WordDocument' : 'Workbook', 'utf16le')) || format === 'xls' && bytes.includes(Buffer.from('Book', 'utf16le'));
 }
 if (format !== 'docx' && format !== 'xlsx' || bytes.length < 22 || bytes.readUInt32LE(0) !== 0x04034b50) return false;
 const names: string[] = []; let end = -1;
 for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 65557); i--) { if (bytes.readUInt32LE(i) === 0x06054b50) { end = i; break; } }
 if (end < 0 || bytes.readUInt16LE(end + 4) !== 0 || bytes.readUInt16LE(end + 6) !== 0) return false;
 const count = bytes.readUInt16LE(end + 10); let offset = bytes.readUInt32LE(end + 16);
 if (!count || count > 4096 || offset >= end) return false;
 for (let i = 0; i < count; i++) {
  if (offset + 46 > end || bytes.readUInt32LE(offset) !== 0x02014b50 || bytes.readUInt16LE(offset + 8) & 1) return false;
  const length = bytes.readUInt16LE(offset + 28); const extra = bytes.readUInt16LE(offset + 30); const comment = bytes.readUInt16LE(offset + 32);
  if (offset + 46 + length + extra + comment > end) return false;
  const name = bytes.subarray(offset + 46, offset + 46 + length).toString('utf8');
  if (name.includes('..') || name.includes('\\') || name.startsWith('/') || /vbaProject\.bin$/i.test(name)) return false;
  names.push(name); offset += 46 + length + extra + comment;
 }
 return names.includes('[Content_Types].xml') && names.includes(format === 'docx' ? 'word/document.xml' : 'xl/workbook.xml');
}
export function safeThread(id: string, data: Record<string, unknown>, admin = false) {
 const text = (key: string, max = 100) => typeof data[key] === 'string' ? String(data[key]).slice(0,max) : '';
 const time = (key: string) => typeof data[key] === 'number' && Number.isFinite(data[key]) ? Number(data[key]) : 0;
 return { id, status: data.status === 'closed' ? 'closed' : 'open', topic: data.topic === 'order' ? 'order' : 'general', orderReference: text('orderReference') || null, orderVerified: data.orderVerified === true, agentName: text('agentName',60), createdAt: time('createdAt'), updatedAt: time('updatedAt'), lastMessageAt: time('lastMessageAt'), messageCount: Math.max(0,Number(data.messageCount) || 0), ...(admin ? {name:text('name',80),phone:text('phone',24),lastMessagePreview:text('lastMessagePreview',160)} : {}) };
}
