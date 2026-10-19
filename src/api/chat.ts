import { randomBytes } from 'node:crypto';
import { z } from 'zod';
import { FieldValue, type DocumentData } from 'firebase-admin/firestore';
import type { VercelRequest, VercelResponse } from '../types/vercel.js';
import { adminDb, requireAdmin } from '../services/firebase/adminServer.js';
import { verifyUploadResponseSignature } from '../services/cloudinary/server.js';
import { cloudinarySignature, type SignatureAlgorithm } from '../services/cloudinary/signature.js';
import { enforceRateLimit, hashIdentifier, requestIp, serverErrorMessage, setPrivateHeaders } from '../services/server/http.js';
import { CHAT_LIMITS, chatRequestSchema, filePolicy, newChatToken, ownsChat, safeSettings, safeThread, sameOrigin, tokenHash, uploadBelongsToActor, validDocumentBytes, validStoredMedia } from '../services/server/chatPolicy.js';

// Server-only, POST-only API. No browser Firestore access or public media URLs.
class ChatError extends Error { constructor(public status: number, message: string) { super(message); } }
function fail(status: number, message: string): never { throw new ChatError(status, message); }
type Actor = { admin: boolean; key: string; token?: string };
const timestamp = () => Math.floor(Date.now() / 1000);
function cloudConfig() {
 const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim() || '';
 const apiKey = process.env.CLOUDINARY_API_KEY?.trim() || '';
 const secret = process.env.CLOUDINARY_API_SECRET?.trim() || '';
 const algorithm = process.env.CLOUDINARY_SIGNATURE_ALGORITHM?.trim().toLowerCase() || 'sha1';
 if (!/^[A-Za-z0-9_-]{1,64}$/.test(cloudName) || !/^\d{6,24}$/.test(apiKey) || secret.length < 10 || !['sha1','sha256'].includes(algorithm)) throw new Error('CLOUDINARY_NOT_CONFIGURED');
 return { cloudName, apiKey, secret, algorithm: algorithm as SignatureAlgorithm };
}
function signedUpload(media: DocumentData) {
 const config = cloudConfig();
 const fields = { type: 'authenticated', allowed_formats: media.format as string, overwrite: 'false', public_id: media.publicId as string, timestamp: String(timestamp()), context: `chat_thread=${media.threadId}|chat_media=${media.id}|chat_mime=${media.contentType}|chat_size=${media.expectedSize}` };
 return { uploadUrl: `https://api.cloudinary.com/v1_1/${config.cloudName}/${media.resourceType}/upload`, fields: { ...fields, api_key:config.apiKey, signature:cloudinarySignature(fields,config.secret,config.algorithm) }, expiresInSeconds: 3600 };
}
function downloadUrl(media: DocumentData) {
 const config = cloudConfig(); const expiresAt = timestamp() + CHAT_LIMITS.downloadSeconds;
 // Raw public IDs contain the extension. Do not request any raw conversion.
 const params = { public_id: String(media.publicId), ...(media.resourceType === 'raw' ? {} : {format:String(media.format)}), type:'authenticated', timestamp:String(timestamp()), expires_at:String(expiresAt), attachment:media.kind === 'document' ? 'true' : 'false' };
 return { url:`https://api.cloudinary.com/v1_1/${config.cloudName}/${media.resourceType}/download?${new URLSearchParams({...params,api_key:config.apiKey,signature:cloudinarySignature(params,config.secret,config.algorithm)})}`, urlExpiresAt:expiresAt*1000 };
}
function attachment(media: DocumentData) {
 return { id:String(media.id), name:String(media.fileName).slice(0,180), contentType:String(media.contentType), size:Number(media.size), kind:media.kind as 'image'|'video'|'document', ...downloadUrl(media) };
}
function message(id: string, data: DocumentData) {
 const media = Array.isArray(data.attachments) ? data.attachments.slice(0,CHAT_LIMITS.attachments) : [];
 return { id, sequence:Number(data.sequence) || 0, sender:data.sender === 'agent' ? 'agent' : 'customer', senderName:typeof data.senderName === 'string' ? data.senderName.slice(0,80) : '', text:typeof data.text === 'string' ? data.text.slice(0,CHAT_LIMITS.text) : '', attachments:media.map(attachment), createdAt:Number(data.createdAt) || 0 };
}
function authorize(data: DocumentData | undefined, actor: Actor): asserts data is DocumentData {
 if (!data || !actor.admin && !ownsChat(data.tokenHash,actor.token)) fail(404,'Conversation not found.');
}
function writable(data: DocumentData, enabled: boolean) {
 if (data.status !== 'open') fail(409,'This conversation is closed.');
 if (!enabled) fail(409,'Live support is currently unavailable.');
 if (Number(data.messageCount) >= CHAT_LIMITS.messages) fail(409,'This conversation has reached its message limit. Start a new conversation.');
}
async function loadResource(media: DocumentData) {
 const config = cloudConfig(); const encodedId = String(media.publicId).split('/').map(encodeURIComponent).join('/');
 const response = await fetch(`https://api.cloudinary.com/v1_1/${config.cloudName}/resources/${media.resourceType}/authenticated/${encodedId}`,{headers:{Authorization:`Basic ${Buffer.from(`${config.apiKey}:${config.secret}`).toString('base64')}`},signal:AbortSignal.timeout(15000)});
 if (response.status === 404) fail(422,'The uploaded file is not available yet.');
 if (!response.ok) throw new Error('CLOUDINARY_REQUEST_FAILED');
 const schema = z.object({public_id:z.string(),resource_type:z.string(),type:z.string(),version:z.number().int(),bytes:z.number().int(),format:z.string().optional(),context:z.object({custom:z.record(z.string())}).optional()}).passthrough();
 const parsed = schema.safeParse(await response.json()); if (!parsed.success) throw new Error('CLOUDINARY_REQUEST_FAILED');
 const asset = parsed.data; const context = asset.context?.custom;
 if (context?.chat_thread !== media.threadId || context?.chat_media !== media.id || context?.chat_mime !== media.contentType || context?.chat_size !== String(media.expectedSize)) fail(422,'File association could not be verified.');
 return {publicId:asset.public_id,resourceType:asset.resource_type,deliveryType:asset.type,version:asset.version,bytes:asset.bytes,format:asset.format === 'jpeg' ? 'jpg' : asset.format || ''};
}
async function verifyDocument(media: DocumentData) {
 // Only a server-generated authenticated URL is fetched, not a client URL.
 const response = await fetch(downloadUrl(media).url,{signal:AbortSignal.timeout(15000),redirect:'error'});
 if (!response.ok || !response.body) throw new Error('CLOUDINARY_REQUEST_FAILED');
 const reader = response.body.getReader(); const chunks: Buffer[] = []; let bytes = 0;
 try { for (;;) { const result = await reader.read(); if (result.done) break; bytes += result.value.byteLength; if (bytes > Number(media.expectedSize) || bytes > 10*1024*1024) fail(422,'Document exceeds its authorized size.'); chunks.push(Buffer.from(result.value)); } } finally { await reader.cancel(); }
 if (bytes !== media.expectedSize || !validDocumentBytes(String(media.format),Buffer.concat(chunks))) fail(422,'Document contents do not match the authorized file type.');
}

export default async function chat(request: VercelRequest, response: VercelResponse) {
 setPrivateHeaders(response);
 if (request.method !== 'POST') { response.setHeader('Allow','POST'); return response.status(405).json({error:'Method not allowed.'}); }
 if (!sameOrigin(request)) return response.status(403).json({error:'A same-origin request is required.'});
 try {
  // Vercel rewrites may add internal route captures to request.query.
  // All chat input and capabilities are parsed exclusively from the strict JSON body.
  if (['token','threadId','action','orderAccessToken'].some(key => Object.prototype.hasOwnProperty.call(request.query,key))) fail(400,'Chat access belongs in the JSON body, not the URL.');
  if (!/^application\/json(?:;|$)/i.test(request.headers['content-type'] || '')) fail(400,'Send an application/json request.');
  if (Number(request.headers['content-length'] || 0) > CHAT_LIMITS.bodyBytes || Buffer.byteLength(JSON.stringify(request.body) || '') > CHAT_LIMITS.bodyBytes) fail(413,'Request is too large.');
  const input = chatRequestSchema.parse(request.body); const db = adminDb(); const ipKey = hashIdentifier(requestIp(request));
  await enforceRateLimit(`chat:ip:${ipKey}`,120,60);
  await enforceRateLimit(`chat:ip-hour:${ipKey}`,6000,3600);
  const settingsRef = db.collection('supportChatSettings').doc('public');
  const settings = safeSettings((await settingsRef.get()).data()?.settings);
  if (input.action === 'settings') return response.status(200).json({settings});
  if (input.action === 'admin-save') {
   const admin = await requireAdmin(request.headers.authorization);
   await enforceRateLimit(`chat:settings:${hashIdentifier(admin.uid)}`,20,60);
   await settingsRef.set({settings:input.settings,updatedAt:Date.now(),updatedBy:admin.uid});
   return response.status(200).json({settings:input.settings});
  }
  if (input.action === 'start') {
   if (!settings.enabled) fail(409,'Live support is currently unavailable.');
   if (input.topic === 'order' && !input.orderReference || input.topic === 'general' && (input.orderReference || input.orderAccessToken)) fail(400,'Supply an order reference only for an order conversation.');
   await enforceRateLimit(`chat:start:${ipKey}`,5,3600); await enforceRateLimit(`chat:start-day:${ipKey}`,20,86400);
   let orderId: string | null = null;
   if (input.orderAccessToken) {
    const access = (await db.collection('orderAccess').doc(tokenHash(input.orderAccessToken)).get()).data();
    if (!access || typeof access.orderId !== 'string' || !/^[A-Za-z0-9_-]{1,120}$/.test(access.orderId)) fail(403,'Order access could not be verified.');
    const order = (await db.collection('orders').doc(access.orderId).get()).data();
    if (!order || typeof order.reference !== 'string' || order.reference !== input.orderReference) fail(403,'Order access could not be verified.');
    orderId = access.orderId;
   }
   const threadId = randomBytes(16).toString('hex'); const capability = newChatToken(); const now = Date.now();
   const data = {tokenHash:tokenHash(capability),name:input.name,phone:input.phone,topic:input.topic,orderReference:input.orderReference || null,orderId,orderVerified:!!orderId,status:'open',agentName:settings.agentName,createdAt:now,updatedAt:now,lastMessageAt:now,messageCount:1,lastMessagePreview:settings.welcomeMessage.slice(0,160)};
   const welcomeId = randomBytes(16).toString('hex'); const welcome = {sequence:1,sender:'agent',senderName:settings.agentName,text:settings.welcomeMessage,attachments:[],createdAt:now};
   const ref = db.collection('supportChats').doc(threadId); const batch = db.batch(); batch.create(ref,data); batch.create(ref.collection('messages').doc(welcomeId),welcome); await batch.commit();
   return response.status(201).json({token:capability,thread:safeThread(threadId,data),messages:[message(welcomeId,welcome)],settings});
  }
  if (input.action === 'admin-list') {
   const admin = await requireAdmin(request.headers.authorization); await enforceRateLimit(`chat:list:${hashIdentifier(admin.uid)}`,60,60);
   // Single-field ordering only: no composite index required, never an unbounded scan.
   let query = db.collection('supportChats').orderBy('updatedAt','desc').limit(input.limit + 1);
   if (input.before) query = query.where('updatedAt','<',input.before);
   const docs = (await query.get()).docs; const page = docs.slice(0,input.limit); const hasMore = docs.length > input.limit;
   return response.status(200).json({threads:page.map(doc=>safeThread(doc.id,doc.data(),true)),hasMore,nextBefore:hasMore ? Number(page[page.length-1]?.data().updatedAt) : null});
  }
  const actor: Actor = 'token' in input && input.token ? {admin:false,key:tokenHash(input.token),token:input.token} : {admin:true,key:(await requireAdmin(request.headers.authorization)).uid};
  const ref = db.collection('supportChats').doc(input.threadId); const data = (await ref.get()).data(); authorize(data,actor);
  const actorRate = hashIdentifier(`${input.threadId}:${actor.admin ? 'admin:' : 'customer:'}${actor.key}`);
  if (input.action === 'read') {
   await enforceRateLimit(`chat:read:${actorRate}`,120,60);
   let query = ref.collection('messages').orderBy('sequence','desc').limit(input.limit+1);
   if (input.before) query = query.where('sequence','<',input.before);
   const docs = (await query.get()).docs; const page = docs.slice(0,input.limit); const hasMore = docs.length > input.limit;
   return response.status(200).json({thread:safeThread(ref.id,data,actor.admin),messages:page.map(doc=>message(doc.id,doc.data())).reverse(),hasMore,nextBefore:hasMore ? Number(page[page.length-1]?.data().sequence) : null,settings});
  }
  if (input.action === 'admin-update') {
   if (!input.status && !input.agentName) fail(400,'Choose a status or agent name.');
   await enforceRateLimit(`chat:update:${actorRate}`,30,60);
   const updated = await db.runTransaction(async tx=>{ const current = (await tx.get(ref)).data(); authorize(current,actor); const patch = {...(input.status ? {status:input.status} : {}),...(input.agentName ? {agentName:input.agentName} : {}),updatedAt:Date.now()}; tx.update(ref,patch); return {...current,...patch}; });
   return response.status(200).json({thread:safeThread(ref.id,updated,true)});
  }
  writable(data,settings.enabled);
  if (input.action === 'sign-upload') {
   const policy = filePolicy(input.contentType,input.fileName,input.size); if (!policy) fail(400,'Choose an allowed file type and extension: images/documents up to 10 MB, videos up to 25 MB.');
   await enforceRateLimit(`chat:upload-ip:${ipKey}`,30,3600); await enforceRateLimit(`chat:upload:${actorRate}`,12,3600);
   const mediaId = randomBytes(16).toString('hex'); const publicId = `desiraluxe/chat/${ref.id}/${mediaId}${policy.resourceType === 'raw' ? '.' + policy.format : ''}`;
   const media = {id:mediaId,threadId:ref.id,actorKey:actor.key,actorAdmin:actor.admin,status:'pending',publicId,resourceType:policy.resourceType,kind:policy.kind,format:policy.format,contentType:input.contentType,fileName:input.fileName,expectedSize:input.size,createdAt:Date.now(),expiresAt:Date.now()+CHAT_LIMITS.uploadLifetimeMs};
   const signed = signedUpload(media);
   await db.runTransaction(async tx=>{ const current=(await tx.get(ref)).data(); const config=(await tx.get(settingsRef)).data(); authorize(current,actor); writable(current,safeSettings(config?.settings).enabled); tx.create(db.collection('supportChatMedia').doc(mediaId),media); });
   return response.status(201).json({mediaId,...signed});
  }
  if (input.action === 'complete-upload') {
   await enforceRateLimit(`chat:complete:${actorRate}`,30,3600);
   const mediaRef = db.collection('supportChatMedia').doc(input.mediaId); const media = (await mediaRef.get()).data();
   if (!media || media.threadId !== ref.id || media.actorKey !== actor.key || media.actorAdmin !== actor.admin || media.expiresAt <= Date.now() || !['pending','ready'].includes(media.status)) fail(404,'Pending upload not found or expired.');
   if (media.publicId !== input.publicId || !verifyUploadResponseSignature(input.publicId,input.version,input.signature)) fail(422,'Cloudinary upload receipt is invalid.');
   if (media.status === 'ready') { if (media.version !== input.version) fail(422,'Upload version does not match.'); return response.status(200).json({attachment:attachment(media)}); }
   const asset = await loadResource(media);
   if (!validStoredMedia(media,asset,input.version)) fail(422,'Stored file type, size or association does not match the authorized upload.');
   if (media.kind === 'document') await verifyDocument(media);
   const ready = await db.runTransaction(async tx=>{
    const current = (await tx.get(mediaRef)).data(); const thread=(await tx.get(ref)).data(); const config=(await tx.get(settingsRef)).data(); authorize(thread,actor); writable(thread,safeSettings(config?.settings).enabled);
    if (!current || current.status !== 'pending' || current.actorKey !== actor.key || current.actorAdmin !== actor.admin || current.threadId !== ref.id || current.publicId !== input.publicId || current.expiresAt <= Date.now()) fail(409,'Upload changed or expired. Start a new upload.');
    const patch={status:'ready',size:asset.bytes,version:asset.version,verifiedAt:Date.now()}; tx.update(mediaRef,patch); return {...current,...patch};
   });
   return response.status(200).json({attachment:attachment(ready)});
  }
  if (input.action === 'send') {
   if (!input.text && !input.attachmentIds.length || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(input.text) || new Set(input.attachmentIds).size !== input.attachmentIds.length) fail(400,'Enter a message or attach files.');
   await enforceRateLimit(`chat:send:${actorRate}`,12,60); await enforceRateLimit(`chat:send-hour:${actorRate}`,100,3600);
   const messageId=tokenHash(`${actor.admin ? 'admin' : 'customer'}:${actor.key}:${input.clientMessageId}`).slice(0,32); const messageRef=ref.collection('messages').doc(messageId);
   const fingerprint=tokenHash(JSON.stringify([input.text,input.attachmentIds]));
   const result = await db.runTransaction(async tx=>{
    const thread=(await tx.get(ref)).data(); const config=(await tx.get(settingsRef)).data(); const existing=(await tx.get(messageRef)).data();
    const mediaRefs=input.attachmentIds.map(mediaId=>db.collection('supportChatMedia').doc(mediaId)); const mediaDocs=await Promise.all(mediaRefs.map(mediaRef=>tx.get(mediaRef)));
    authorize(thread,actor); writable(thread,safeSettings(config?.settings).enabled);
    if (existing) { if (existing.fingerprint !== fingerprint) fail(409,'This message ID was already used for different content.'); return {thread,message:existing}; }
    const now=Date.now(); const throttleKey=actor.admin ? 'lastAgentMessageAt' : 'lastCustomerMessageAt';
    if (now - Number(thread[throttleKey] || 0) < 900) fail(429,'Please wait before sending another message.');
    const attachments=mediaDocs.map(doc=>{const media=doc.data();if (!uploadBelongsToActor(media,ref.id,actor.key,now) || media?.actorAdmin !== actor.admin) fail(422,'An attachment is expired, already used, or belongs to another conversation.'); return media!;});
    const senderName=actor.admin ? String(thread.agentName || safeSettings(config?.settings).agentName) : String(thread.name);
    const sent={sequence:Number(thread.messageCount)+1,sender:actor.admin ? 'agent' : 'customer',senderName,text:input.text,attachments,createdAt:now,fingerprint};
    const patch={messageCount:sent.sequence,lastMessageAt:now,updatedAt:now,lastMessagePreview:(input.text || '[Attachment]').slice(0,160),[throttleKey]:now};
    tx.create(messageRef,sent); tx.update(ref,patch); mediaRefs.forEach(mediaRef=>tx.update(mediaRef,{messageId,status:'attached',attachedAt:now,expiresAt:FieldValue.delete()})); return {thread:{...thread,...patch},message:sent};
   });
   return response.status(200).json({message:message(messageId,result.message),thread:safeThread(ref.id,result.thread,actor.admin)});
  }
  fail(400,'Unknown chat action.');
 } catch (error) {
  if (error instanceof ChatError) return response.status(error.status).json({error:error.message});
  if (error instanceof z.ZodError) return response.status(400).json({error:'Chat request is invalid.'});
  const failure=serverErrorMessage(error); return response.status(failure.status).json({error:failure.message});
 }
}

/** Cron-only helper. Caller must enforce cron/admin authentication. Never an API action. */
export async function cleanupExpiredChatMedia(maximum = 50): Promise<{ checked: number; deleted: number }> {
 const db=adminDb(); const limit=Math.max(1,Math.min(100,Math.floor(maximum) || 50));
 const docs=(await db.collection('supportChatMedia').where('expiresAt','<=',Date.now()).orderBy('expiresAt','asc').limit(limit).get()).docs;
 let deleted=0;
 for (const doc of docs) {
  const media=await db.runTransaction(async tx=>{
   const data=(await tx.get(doc.ref)).data();
   if (!data || data.messageId || !['pending','ready','expired'].includes(data.status) || typeof data.expiresAt !== 'number' || data.expiresAt>Date.now() || !/^[a-f0-9]{32}$/.test(data.threadId) || !/^[a-f0-9]{32}$/.test(doc.id) || !/^desiraluxe\/chat\/[a-f0-9]{32}\/[a-f0-9]{32}(?:\.(?:pdf|doc|docx|xls|xlsx|txt))?$/.test(data.publicId) || data.publicId.split('/')[2] !== data.threadId || data.publicId.split('/')[3].split('.')[0] !== doc.id) return null;
   tx.update(doc.ref,{status:'expired'}); return data;
  });
  if (!media) continue;
  const config=cloudConfig();
  // Cloudinary excludes resource_type from upload signatures. Remove any wrong
  // resource-type variant at this unique conversation-owned public ID as well.
  for (const resourceType of ['image','video','raw']) {
   const params={public_id:String(media.publicId),type:'authenticated',invalidate:'true',timestamp:String(timestamp())};
   const result=await fetch(`https://api.cloudinary.com/v1_1/${config.cloudName}/${resourceType}/destroy`,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({...params,api_key:config.apiKey,signature:cloudinarySignature(params,config.secret,config.algorithm)}),signal:AbortSignal.timeout(15000)});
   if (!result.ok) throw new Error('CLOUDINARY_REQUEST_FAILED');
   const payload:unknown=await result.json();
   if (!payload || typeof payload!=='object' || !('result' in payload) || !['ok','not found'].includes(String(payload.result))) throw new Error('CLOUDINARY_REQUEST_FAILED');
  }
  await doc.ref.delete(); deleted++;
 }
 return {checked:docs.length,deleted};
}
