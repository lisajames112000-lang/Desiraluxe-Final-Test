import { beforeEach, describe, expect, it, vi } from 'vitest';
vi.mock('./api', () => ({ apiRequest: vi.fn() }));
import { CHAT_SESSION_KEY, fileError, loadChatSession, mergeChatMessages, safeCloudinaryUrl, storeChatSession, whatsappUrl, type ChatMessage } from './chatClient';

beforeEach(() => localStorage.clear());
describe('support client boundaries', () => {
  it('normalizes Pakistan WhatsApp numbers and rejects invalid destinations', () => {
    expect(whatsappUrl('03039009355')).toBe('https://wa.me/923039009355');
    expect(whatsappUrl('invalid', '+92 303 9009355')).toBe('https://wa.me/923039009355');
    expect(whatsappUrl('', '123')).toBeNull();
  });
  it('allows only trusted HTTPS Cloudinary uploads and signed downloads', () => {
    expect(safeCloudinaryUrl('https://api.cloudinary.com/v1_1/demo/raw/upload', true)).toBeTruthy();
    expect(safeCloudinaryUrl('https://evil.example/file.png')).toBeNull();
    expect(safeCloudinaryUrl('https://api.cloudinary.com.evil.example/v1_1/demo/raw/upload', true)).toBeNull();
    expect(safeCloudinaryUrl('javascript:alert(1)')).toBeNull();
    expect(safeCloudinaryUrl('https://api.cloudinary.com/v1_1/demo/raw/download')).toBeNull();
    expect(safeCloudinaryUrl('https://api.cloudinary.com/v1_1/demo/raw/download?signature=' + 'a'.repeat(40) + '&expires_at=1234567890')).toBeTruthy();
  });
  it('persists private access only when the capability shape is valid', () => {
    const value = {threadId:'a'.repeat(32), token:'b'.repeat(64), seenSequence:4};
    expect(storeChatSession(value)).toBe(true); expect(loadChatSession()).toEqual(value);
    localStorage.setItem(CHAT_SESSION_KEY, JSON.stringify({threadId:'wrong', token:'wrong'}));
    expect(loadChatSession()).toBeNull(); expect(storeChatSession(null)).toBe(true);
    expect(localStorage.getItem(CHAT_SESSION_KEY)).toBeNull();
  });
  it('enforces matching file types and rejects active or empty content', () => {
    expect(fileError(new File(['ok'], 'proof.png', {type:'image/png'}))).toBeNull();
    expect(fileError(new File(['ok'], 'proof.pdf', {type:'image/png'}))).toBeTruthy();
    expect(fileError(new File(['<svg/>'], 'proof.svg', {type:'image/svg+xml'}))).toBeTruthy();
    expect(fileError(new File([], 'empty.txt', {type:'text/plain'}))).toBeTruthy();
  });
  it('merges refreshed messages without duplicates and in server sequence order', () => {
    const m = (id:string, sequence:number, text:string):ChatMessage => ({id,sequence,text,sender:'agent',senderName:'Support',createdAt:1,attachments:[]});
    expect(mergeChatMessages([m('one',1,'old'),m('two',2,'second')],[m('one',1,'fresh')]).map(v=>v.text)).toEqual(['fresh','second']);
  });
});
