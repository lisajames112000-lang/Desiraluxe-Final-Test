import { apiRequest, type ApiResponseValidator } from './api';

export interface ChatSettings { enabled: boolean; agentName: string; welcomeMessage: string; whatsappNumber: string }
export interface ChatThread { id: string; status: 'open' | 'closed'; topic: 'general' | 'order'; orderReference: string | null; orderVerified: boolean; agentName: string; createdAt: number; updatedAt: number; lastMessageAt: number; messageCount: number; name?: string; phone?: string; lastMessagePreview?: string }
export interface ChatAttachment { id: string; name: string; contentType: string; size: number; kind: 'image' | 'video' | 'document'; url: string; urlExpiresAt: number }
export interface ChatMessage { id: string; sequence: number; sender: 'customer' | 'agent'; senderName: string; text: string; attachments: ChatAttachment[]; createdAt: number }
export interface ChatSession { threadId: string; token: string; seenSequence: number }
export interface ChatIdentity { threadId: string; token?: string }
export interface ChatRead { thread: ChatThread; messages: ChatMessage[]; nextBefore: number | null; hasMore: boolean; settings: ChatSettings }
export interface ChatStart { thread: ChatThread; token: string; messages: ChatMessage[]; settings: ChatSettings }
export interface ChatList { threads: ChatThread[]; nextBefore: number | null; hasMore: boolean }
export interface ChatSend { thread: ChatThread; message: ChatMessage }
export interface SignedChatUpload { mediaId: string; uploadUrl: string; fields: Record<string, string>; expiresInSeconds: number }

const record = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const str = (v: unknown): v is string => typeof v === 'string';
const num = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const id = (v: unknown): v is string => str(v) && /^[a-f0-9]{32}$/.test(v);
const settings = (v: unknown): v is ChatSettings => record(v) && typeof v.enabled === 'boolean' && str(v.agentName) && str(v.welcomeMessage) && str(v.whatsappNumber);
const thread = (v: unknown): v is ChatThread => record(v) && id(v.id) && ['open','closed'].includes(String(v.status)) && ['general','order'].includes(String(v.topic)) && (v.orderReference === null || str(v.orderReference)) && typeof v.orderVerified === 'boolean' && str(v.agentName) && ['createdAt','updatedAt','lastMessageAt','messageCount'].every(k => num(v[k]));
export function safeCloudinaryUrl(value: string, upload = false): string | null {
  try {
    const u = new URL(value);
    if (u.protocol !== 'https:' || u.username || u.password || u.port) return null;
    if (upload) return u.hostname === 'api.cloudinary.com' && /^\/v1_1\/[a-zA-Z0-9_-]+\/(image|video|raw)\/upload$/.test(u.pathname) ? u.href : null;
    // Authenticated raw documents need Cloudinary's expiring signed download
    // API. Normal res.cloudinary.com path signatures alone do not expire.
    const signedDownload = u.hostname === 'api.cloudinary.com' && /^\/v1_1\/[a-zA-Z0-9_-]+\/(image|video|raw)\/download$/.test(u.pathname) && /^[a-f0-9]{40,64}$/i.test(u.searchParams.get('signature') || '') && /^\d+$/.test(u.searchParams.get('expires_at') || '');
    return u.hostname === 'res.cloudinary.com' || signedDownload ? u.href : null;
  } catch { return null; }
}
const attachment = (v: unknown): v is ChatAttachment => record(v) && id(v.id) && str(v.name) && str(v.contentType) && num(v.size) && ['image','video','document'].includes(String(v.kind)) && str(v.url) && !!safeCloudinaryUrl(v.url) && num(v.urlExpiresAt);
const message = (v: unknown): v is ChatMessage => record(v) && str(v.id) && num(v.sequence) && ['customer','agent'].includes(String(v.sender)) && str(v.senderName) && str(v.text) && num(v.createdAt) && Array.isArray(v.attachments) && v.attachments.every(attachment);
const messages = (v: unknown): v is ChatMessage[] => Array.isArray(v) && v.every(message);
const pagination = (v: Record<string,unknown>) => (v.nextBefore === null || num(v.nextBefore)) && typeof v.hasMore === 'boolean';
function request<T>(action: string, body: Record<string, unknown>, authenticated: boolean, validate: ApiResponseValidator<T>, signal?: AbortSignal) {
  return apiRequest('/api/chat', {method:'POST', body:JSON.stringify({action,...body}), signal}, authenticated, validate);
}
export const chatClient = {
  settings: (signal?: AbortSignal) => request('settings', {}, false, (v): v is {settings:ChatSettings} => record(v) && settings(v.settings), signal),
  start: (body: {name:string;phone:string;topic:'general'|'order';orderReference?:string;orderAccessToken?:string}, signal?: AbortSignal) => request('start', body, false, (v): v is ChatStart => record(v) && thread(v.thread) && str(v.token) && /^[a-f0-9]{64}$/.test(v.token) && messages(v.messages) && settings(v.settings), signal),
  read: (identity: ChatIdentity, before?: number, signal?: AbortSignal) => request('read', {...identity,...(before ? {before} : {}),limit:50}, !identity.token, (v): v is ChatRead => record(v) && thread(v.thread) && messages(v.messages) && pagination(v) && settings(v.settings), signal),
  send: (identity: ChatIdentity, text: string, attachmentIds: string[], clientMessageId: string, signal?: AbortSignal) => request('send', {...identity,text,attachmentIds,clientMessageId}, !identity.token, (v): v is ChatSend => record(v) && thread(v.thread) && message(v.message), signal),
  list: (signal?: AbortSignal) => request('admin-list', {limit:100}, true, (v): v is ChatList => record(v) && Array.isArray(v.threads) && v.threads.every(t => thread(t) && record(t) && str(t.name) && str(t.phone) && str(t.lastMessagePreview)) && pagination(v), signal),
  update: (threadId: string, status: 'open'|'closed', signal?: AbortSignal) => request('admin-update', {threadId,status}, true, (v): v is {thread:ChatThread} => record(v) && thread(v.thread), signal),
  assignAgent: (threadId: string, agentName: string, signal?: AbortSignal) => request('admin-update', {threadId,agentName}, true, (v): v is {thread:ChatThread} => record(v) && thread(v.thread), signal),
  save: (value: ChatSettings, signal?: AbortSignal) => request('admin-save', {settings:value}, true, (v): v is {settings:ChatSettings} => record(v) && settings(v.settings), signal),
  sign: (identity:ChatIdentity, file:File, signal?:AbortSignal) => request('sign-upload', {...identity,fileName:file.name,contentType:file.type || mimeForName(file.name),size:file.size}, !identity.token, (v): v is SignedChatUpload => record(v) && id(v.mediaId) && str(v.uploadUrl) && !!safeCloudinaryUrl(v.uploadUrl,true) && record(v.fields) && Object.values(v.fields).every(str) && num(v.expiresInSeconds), signal),
  complete: (identity:ChatIdentity, mediaId:string, result:{public_id:string;version:number;signature:string}, signal?:AbortSignal) => request('complete-upload', {...identity,mediaId,publicId:result.public_id,version:result.version,signature:result.signature}, !identity.token, (v): v is {attachment:ChatAttachment} => record(v) && attachment(v.attachment), signal)
};
const FILE_TYPES: Record<string,string> = {jpg:'image/jpeg',jpeg:'image/jpeg',png:'image/png',webp:'image/webp',mp4:'video/mp4',webm:'video/webm',pdf:'application/pdf',doc:'application/msword',docx:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',xls:'application/vnd.ms-excel',xlsx:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',txt:'text/plain'};
export const CHAT_FILE_ACCEPT = Object.keys(FILE_TYPES).map(e => '.'+e).join(',');
function mimeForName(name:string) { return FILE_TYPES[name.split('.').pop()?.toLowerCase() || ''] || ''; }
export function fileError(file:File):string | null {
  const expected = mimeForName(file.name); const type = file.type || expected;
  const max = type.startsWith('video/') ? 25 : 10;
  if (!expected || type !== expected || /[\\/\u0000-\u001f]/.test(file.name) || file.name.length > 180) return 'Choose JPG, PNG, WebP, MP4, WebM, PDF, Word, Excel or TXT files.';
  return !file.size || file.size > max*1024*1024 ? file.name + ': maximum ' + max + ' MB (empty files are not accepted).' : null;
}
export async function uploadChatFile(identity:ChatIdentity,file:File,signal:AbortSignal,onProgress:(percent:number)=>void):Promise<ChatAttachment> {
  const invalid=fileError(file); if(invalid) throw new Error(invalid);
  const signed=await chatClient.sign(identity,file,signal);
  const result=await new Promise<{public_id:string;version:number;signature:string}>((resolve,reject)=>{
    const xhr=new XMLHttpRequest(); const abort=()=>xhr.abort();
    const finish=()=>signal.removeEventListener('abort',abort);
    if(signal.aborted) { reject(new Error('Upload cancelled.')); return; }
    signal.addEventListener('abort',abort,{once:true});
    xhr.open('POST',signed.uploadUrl); xhr.timeout=120000;
    xhr.upload.onprogress=e=>{if(e.lengthComputable) onProgress(Math.round(e.loaded/e.total*100));};
    xhr.onload=()=>{finish();try { const v:unknown=JSON.parse(xhr.responseText); if(xhr.status>=200 && xhr.status<300 && record(v) && str(v.public_id) && num(v.version) && str(v.signature)) resolve({public_id:v.public_id,version:v.version,signature:v.signature}); else reject(new Error('Upload was not accepted. Retry the file.')); } catch {reject(new Error('Upload returned an invalid response.'));}};
    xhr.onerror=()=>{finish();reject(new Error('Upload connection failed. Retry the file.'));};
    xhr.ontimeout=()=>{finish();reject(new Error('Upload timed out. Retry the file.'));};
    xhr.onabort=()=>{finish();reject(new Error('Upload cancelled.'));};
    const data=new FormData(); Object.entries(signed.fields).forEach(([key,value])=>data.append(key,value)); data.append('file',file); xhr.send(data);
  });
  return (await chatClient.complete(identity,signed.mediaId,result,signal)).attachment;
}
export function whatsappUrl(...numbers:(string|undefined)[]):string | null {
  for(const value of numbers) { let n=(value||'').replace(/[^0-9]/g,''); if(n.startsWith('00')) n=n.slice(2); if(/^03\d{9}$/.test(n)) n='92'+n.slice(1); if(/^3\d{9}$/.test(n)) n='92'+n; if(/^[1-9]\d{6,14}$/.test(n)) return 'https://wa.me/'+n; } return null;
}
export const CHAT_SESSION_KEY='desiraluxe.support.session.v1';
export function loadChatSession():ChatSession|null { try { const v:unknown=JSON.parse(localStorage.getItem(CHAT_SESSION_KEY)||'null'); return record(v) && id(v.threadId) && str(v.token) && /^[a-f0-9]{64}$/.test(v.token) ? {threadId:v.threadId,token:v.token,seenSequence:num(v.seenSequence)?v.seenSequence:0}:null; } catch {return null;} }
export function storeChatSession(session:ChatSession|null):boolean { try { if(session) localStorage.setItem(CHAT_SESSION_KEY,JSON.stringify(session)); else localStorage.removeItem(CHAT_SESSION_KEY); return true; } catch {return false;} }
export function mergeChatMessages(current:ChatMessage[],incoming:ChatMessage[]):ChatMessage[] { const map=new Map(current.map(m=>[m.id,m])); incoming.forEach(m=>map.set(m.id,m)); return [...map.values()].sort((a,b)=>a.sequence-b.sequence); }
export function chatError(error:unknown):string { if(typeof navigator!=='undefined' && !navigator.onLine) return 'You are offline. Reconnect, then retry. Your unsent message stays here.'; return error instanceof Error ? error.message : 'The support service could not be reached. Please retry.'; }
