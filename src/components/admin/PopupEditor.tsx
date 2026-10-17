import React, { useEffect, useState } from 'react';
import { Alert, Button, Group, Modal, MultiSelect, NumberInput, Select, Stack, Switch, TextInput, Textarea } from '@mantine/core';
import type { PromoPopup } from '../../types/settings';
import type { MutationResult } from '../../types/backend';
import { generateId } from '../../utils/id';
import { storeDateTimeInput, storeWallTimeToIso } from '../../utils/storeTime';
import { MediaUploader } from './MediaUploader';

const routeOptions = ['/', '/shop', '/categories', '/about', '/contact', '/cart', '/track-order'];

export function PopupEditor({ opened, popup, onClose, onSave }: {opened: boolean;popup?: PromoPopup | null;onClose: () => void;onSave: (popup: PromoPopup) => Promise<MutationResult>;}) {
  const [draft, setDraft] = useState<Partial<PromoPopup>>({});const [errors, setErrors] = useState<Record<string, string>>({});const [status, setStatus] = useState('');const [saving, setSaving] = useState(false);
  useEffect(() => {setDraft(popup || { title: '', message: '', ctaHref: '/shop', isEnabled: false, routes: ['/'], frequency: 'session', delayMs: 1800, priority: 1, campaignVersion: 1 });setErrors({});setStatus('');}, [opened, popup]);
  const save = async () => {
    const next: Record<string, string> = {};
    if (!draft.title?.trim()) next.title = 'Headline is required.';
    if (!draft.message?.trim()) next.message = 'Message is required.';
    const startAt = storeWallTimeToIso(draft.startAt);const endAt = storeWallTimeToIso(draft.endAt);
    if (draft.startAt && !startAt) next.schedule = 'Enter a valid start in Asia/Karachi time.';
    if (draft.endAt && !endAt) next.schedule = 'Enter a valid end in Asia/Karachi time.';
    if (startAt && endAt && Date.parse(startAt) >= Date.parse(endAt)) next.schedule = 'Start must be before end.';
    setErrors(next);if (Object.keys(next).length) return;
    const bumpedVersion = popup && (popup.title !== draft.title || popup.message !== draft.message) ? (popup.campaignVersion || 1) + 1 : draft.campaignVersion || 1;
    setSaving(true);
    const result = await onSave({ id: popup?.id || generateId('popup'), title: draft.title!.trim(), message: draft.message!.trim(), image: draft.image || undefined, ctaLabel: draft.ctaLabel || undefined, ctaHref: draft.ctaHref || undefined, isEnabled: !!draft.isEnabled, startAt, endAt, routes: draft.routes || [], frequency: draft.frequency || 'session', delayMs: Math.min(30000, Math.max(0, Number(draft.delayMs) || 1800)), priority: Number(draft.priority) || 1, campaignVersion: bumpedVersion, updatedAt: popup?.updatedAt });
    setSaving(false);if (result.ok) onClose();else setStatus(result.message);
  };
  return <Modal opened={opened} onClose={onClose} title={popup ? 'Edit popup' : 'Add popup'} size="lg" closeOnClickOutside={!saving}><Stack><TextInput required label="Headline" error={errors.title} value={draft.title || ''} onChange={(event) => setDraft({ ...draft, title: event.currentTarget.value })} /><Textarea required label="Message" minRows={3} error={errors.message} value={draft.message || ''} onChange={(event) => setDraft({ ...draft, message: event.currentTarget.value })} /><MediaUploader role="popup" entityId={popup?.id || 'new-popup'} value={draft.image} alt={draft.title || 'Popup preview'} onChange={(image) => setDraft({ ...draft, image })} /><div className="grid gap-3 sm:grid-cols-2"><TextInput label="CTA label" value={draft.ctaLabel || ''} onChange={(event) => setDraft({ ...draft, ctaLabel: event.currentTarget.value })} /><TextInput label="Destination" value={draft.ctaHref || ''} onChange={(event) => setDraft({ ...draft, ctaHref: event.currentTarget.value })} /></div><MultiSelect label="Applicable routes (empty = all routes)" data={routeOptions.map((value) => ({ value, label: value }))} value={draft.routes || []} onChange={(routes) => setDraft({ ...draft, routes })} /><div className="grid gap-3 sm:grid-cols-3"><Select label="Frequency" data={[{ value: 'session', label: 'Once per session' }, { value: 'day', label: 'Once per day' }, { value: 'once', label: 'Once per campaign' }]} value={draft.frequency || 'session'} onChange={(value) => setDraft({ ...draft, frequency: (value || 'session') as PromoPopup['frequency'] })} /><NumberInput label="Delay (ms)" min={0} max={30000} value={draft.delayMs ?? 1800} onChange={(value) => setDraft({ ...draft, delayMs: Number(value) })} /><NumberInput label="Priority" min={1} max={10} value={draft.priority ?? 1} onChange={(value) => setDraft({ ...draft, priority: Number(value) })} /></div><div className="grid gap-3 sm:grid-cols-2"><TextInput label="Start" type="datetime-local" value={storeDateTimeInput(draft.startAt)} onChange={(event) => setDraft({ ...draft, startAt: event.currentTarget.value ? new Date(event.currentTarget.value).toISOString() : undefined })} /><TextInput label="End" type="datetime-local" value={storeDateTimeInput(draft.endAt)} onChange={(event) => setDraft({ ...draft, endAt: event.currentTarget.value ? new Date(event.currentTarget.value).toISOString() : undefined })} /></div>{errors.schedule && <Alert color="red">{errors.schedule}</Alert>}<Switch label="Enabled" color="emerald" checked={!!draft.isEnabled} onChange={(event) => setDraft({ ...draft, isEnabled: event.currentTarget.checked })} />{status && <Alert color="red">{status} Your edits are preserved.</Alert>}<Group justify="end"><Button variant="default" onClick={onClose} disabled={saving}>Cancel</Button><Button color="emerald" loading={saving} onClick={() => void save()}>Save popup</Button></Group></Stack></Modal>;
}