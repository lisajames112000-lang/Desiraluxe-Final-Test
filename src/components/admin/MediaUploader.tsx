import React, { useEffect, useRef, useState } from 'react';
import { Alert, Button, Group, Progress, Stack, Text } from '@mantine/core';
import { ImageIcon, RotateCcwIcon, UploadCloudIcon, XIcon } from 'lucide-react';
import type { MediaRole } from '../../config/media';
import { mediaRequirements } from '../../config/media';
import { apiRequest } from '../../services/api';
import { isCloudinaryUploadResult, isCompletedUploadResponse, isSignedUploadResponse, type CloudinaryUploadResult } from '../../services/apiContracts';
import { ImageWithFallback } from '../common/ImageWithFallback';

interface MediaUploaderProps {
  role: MediaRole;
  entityId: string;
  value?: string;
  alt: string;
  onChange: (url: string) => void;
}

async function imageDimensions(file: File): Promise<{width?: number;height?: number;}> {
  if (!file.type.startsWith('image/')) return {};
  const bitmap = await createImageBitmap(file);
  const dimensions = { width: bitmap.width, height: bitmap.height };
  bitmap.close();
  return dimensions;
}

function parseJson(text: string): unknown {
  try {return JSON.parse(text);} catch {return null;}
}

function cloudinaryErrorMessage(payload: unknown): string {
  if (typeof payload === 'object' && payload !== null && 'error' in payload) {
    const error = (payload as {error?: {message?: unknown;};}).error;
    if (typeof error?.message === 'string' && error.message) return `Cloudinary rejected the upload: ${error.message}`;
  }
  return 'Cloudinary rejected the upload.';
}

export function MediaUploader({ role, entityId, value, alt, onChange }: MediaUploaderProps) {
  const requirement = mediaRequirements[role];
  const inputRef = useRef<HTMLInputElement>(null);
  const requestRef = useRef<XMLHttpRequest | null>(null);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<'idle' | 'uploading' | 'error' | 'ready'>('idle');
  const [message, setMessage] = useState('');
  const mountedRef = useRef(true);
  useEffect(() => () => {mountedRef.current = false;requestRef.current?.abort();}, []);

  const upload = async (file?: File) => {
    if (!file) return;
    setMessage('');
    if (!requirement.accept.includes(file.type) || file.size > requirement.maxBytes) {
      setStatus('error');setMessage(`Use ${requirement.accept.join(', ')} up to ${Math.round(requirement.maxBytes / 1_000_000)} MB.`);return;
    }
    setStatus('uploading');setProgress(0);
    try {
      const dimensions = await imageDimensions(file);
      const signed = await apiRequest('/api/media/sign-upload', { method: 'POST', body: JSON.stringify({ role, entityId, fileName: file.name, contentType: file.type, size: file.size }) }, true, isSignedUploadResponse);
      const uploaded = await new Promise<CloudinaryUploadResult>((resolve, reject) => {
        const form = new FormData();
        Object.entries(signed.fields).forEach(([name, fieldValue]) => form.append(name, fieldValue));
        form.append('file', file);
        const request = new XMLHttpRequest();requestRef.current = request;
        request.open('POST', signed.uploadUrl);
        request.upload.onprogress = (event) => {if (event.lengthComputable) setProgress(Math.round(event.loaded / event.total * 100));};
        request.onload = () => {
          const payload = parseJson(request.responseText);
          if (request.status >= 200 && request.status < 300 && isCloudinaryUploadResult(payload)) resolve(payload);else
          reject(new Error(cloudinaryErrorMessage(payload)));
        };
        request.onerror = () => reject(new Error('Upload connection failed.'));
        request.onabort = () => reject(new Error('Upload cancelled.'));
        request.send(form);
      });
      const completed = await apiRequest('/api/media/complete', { method: 'POST', body: JSON.stringify({ mediaId: signed.mediaId, publicId: uploaded.public_id, version: uploaded.version, signature: uploaded.signature, ...dimensions }) }, true, isCompletedUploadResponse);
      if (mountedRef.current) {onChange(completed.url);setStatus('ready');setMessage('Upload verified. Save the record to publish this replacement.');}
    } catch (cause) {
      if (mountedRef.current) {setStatus('error');setMessage(cause instanceof Error ? cause.message : 'Upload failed.');}
    } finally {requestRef.current = null;}
  };

  return <Stack gap="xs"><Text fw={600} size="sm">{requirement.label}</Text><Text size="xs" c="dimmed">Accepted: {requirement.accept.join(', ')} · Max {Math.round(requirement.maxBytes / 1_000_000)} MB · Recommended {requirement.recommended} · {requirement.ratio} · {requirement.fit}. {requirement.advisory}</Text>{value && (role === 'video' ? <video src={value} controls preload="metadata" className="max-h-48 w-full rounded-xl border border-line bg-black object-contain" aria-label={alt} /> : <ImageWithFallback src={value} alt={alt} className="max-h-48 w-full rounded-xl border border-line object-contain" containerClassName="h-40 rounded-xl" />)}<input ref={inputRef} type="file" className="sr-only" accept={requirement.accept.join(',')} onChange={(event) => {void upload(event.currentTarget.files?.[0]);event.currentTarget.value = '';}} /><Group><Button variant="light" color="emerald" leftSection={value ? <RotateCcwIcon size={16} /> : <UploadCloudIcon size={16} />} onClick={() => inputRef.current?.click()} loading={status === 'uploading'}>{value ? 'Replace media' : 'Upload media'}</Button>{status === 'uploading' && <Button variant="subtle" color="red" leftSection={<XIcon size={16} />} onClick={() => requestRef.current?.abort()}>Cancel</Button>}{value && <Button variant="subtle" color="red" leftSection={<ImageIcon size={16} />} onClick={() => onChange('')}>Remove from record</Button>}</Group>{status === 'uploading' && <Progress value={progress} aria-label={`Upload ${progress}% complete`} />}{message && <Alert color={status === 'error' ? 'red' : 'green'} role={status === 'error' ? 'alert' : 'status'}>{message}</Alert>}</Stack>;
}