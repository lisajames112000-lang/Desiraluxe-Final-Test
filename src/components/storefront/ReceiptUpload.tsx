import { useState } from 'react';
import { Alert, FileInput, Text } from '@mantine/core';
import { UploadCloudIcon } from 'lucide-react';
import { apiRequest, hasStringFields } from '../../services/api';
import { isSignedUploadResponse, isCloudinaryUploadResult } from '../../services/apiContracts';

export function ReceiptUpload({ ownerToken, onReady, disabled }: {
  ownerToken: string;
  onReady: (id: string) => void;
  disabled: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [ready, setReady] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  async function upload(selected: File | null) {
    setFile(selected);
    onReady('');
    setReady(false);
    setError('');
    if (!selected) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(selected.type) || selected.size <= 0 || selected.size > 5 * 1024 * 1024) {
      setFile(null);
      setError('Use a JPEG, PNG or WebP image up to 5 MB.');
      return;
    }
    setBusy(true);
    try {
      const signed = await apiRequest('/api/orders/receipt', {
        method: 'POST',
        body: JSON.stringify({ action: 'sign', ownerToken, contentType: selected.type, size: selected.size })
      }, false, isSignedUploadResponse);
      const body = new FormData();
      Object.entries(signed.fields).forEach(([key, value]) => body.append(key, value));
      body.append('file', selected);
      const response = await fetch(signed.uploadUrl, { method: 'POST', body, signal: AbortSignal.timeout(60000) });
      const result: unknown = await response.json();
      if (!response.ok || !isCloudinaryUploadResult(result)) throw new Error('Image upload failed. Select the image again to retry.');
      const complete = await apiRequest('/api/orders/receipt', {
        method: 'POST',
        body: JSON.stringify({ action: 'complete', ownerToken, receiptId: signed.mediaId, publicId: result.public_id, version: result.version, signature: result.signature })
      }, false, hasStringFields<{ receiptId: string }>('receiptId'), 30000);
      onReady(complete.receiptId);
      setReady(true);
    } catch (cause) {
      setFile(null);
      setError(cause instanceof Error ? cause.message : 'Upload failed.');
    } finally {
      setBusy(false);
    }
  }

  return <div>
    <FileInput
      label="Payment proof image"
      placeholder="Upload payment proof image"
      leftSection={<UploadCloudIcon size={18} aria-hidden="true" />}
      required
      clearable
      value={file}
      accept="image/jpeg,image/png,image/webp"
      description="Upload your payment receipt or screenshot. JPEG, PNG or WebP, maximum 5 MB. Only you and the reviewing admin can access it."
      disabled={disabled || busy}
      onChange={(selected) => void upload(selected)}
      mt="lg"
    />
    {busy && <Text size="sm" role="status" mt="sm">Uploading and verifying image...</Text>}
    {ready && <Alert mt="sm" color="green" role="status">Receipt uploaded securely. Payment still requires admin review.</Alert>}
    {error && <Alert mt="sm" color="red" role="alert">{error} Select your image again to retry.</Alert>}
  </div>;
}
