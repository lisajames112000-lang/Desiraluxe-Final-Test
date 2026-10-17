import React, { useEffect, useState } from 'react';
import { Alert, Button, Group, Modal, Stack, Switch, TextInput, Textarea } from '@mantine/core';
import type { CmsPage } from '../../types/settings';
import type { MutationResult } from '../../types/backend';
import { generateId } from '../../utils/id';

function slugify(value: string) {return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');}
export function PageEditor({ opened, page, pages, onClose, onSave }: {opened: boolean;page?: CmsPage | null;pages: CmsPage[];onClose: () => void;onSave: (page: CmsPage) => Promise<MutationResult>;}) {
  const [draft, setDraft] = useState<Partial<CmsPage>>({});const [errors, setErrors] = useState<Record<string, string>>({});const [status, setStatus] = useState('');const [saving, setSaving] = useState(false);
  useEffect(() => {setDraft(page || { title: '', slug: '', content: '', isSystem: false, isPublished: false });setErrors({});setStatus('');}, [opened, page]);
  const save = async () => {
    const next: Record<string, string> = {};const title = draft.title?.trim() || '';const slug = slugify(draft.slug || '');
    if (!title) next.title = 'Title is required.';if (!slug) next.slug = 'Enter a valid slug.';
    if (pages.some((item) => item.id !== page?.id && item.slug.toLowerCase() === slug)) next.slug = 'Another page already uses this slug.';
    setErrors(next);if (Object.keys(next).length) return;
    setSaving(true);
    const result = await onSave({ id: page?.id || generateId('page'), title, slug, content: draft.content || '', isSystem: page?.isSystem || false, isPublished: !!draft.isPublished, updatedAt: page?.updatedAt });
    setSaving(false);if (result.ok) onClose();else setStatus(result.message);
  };
  return <Modal opened={opened} onClose={onClose} title={page ? 'Edit page' : 'Add CMS page'} size="xl" closeOnClickOutside={!saving}><Stack><TextInput required label="Title" error={errors.title} value={draft.title || ''} onChange={(event) => setDraft({ ...draft, title: event.currentTarget.value, slug: page ? draft.slug : slugify(event.currentTarget.value) })} /><TextInput required label="Slug" error={errors.slug} disabled={page?.isSystem} value={draft.slug || ''} onChange={(event) => setDraft({ ...draft, slug: event.currentTarget.value })} /><Textarea label="Content" minRows={14} value={draft.content || ''} onChange={(event) => setDraft({ ...draft, content: event.currentTarget.value })} description="Plain-text safe editor: scripts and raw HTML are not executed." /><Switch label="Published" color="emerald" checked={!!draft.isPublished} onChange={(event) => setDraft({ ...draft, isPublished: event.currentTarget.checked })} />{status && <Alert color="red">{status} Your edits are preserved.</Alert>}<Group justify="end"><Button variant="default" onClick={onClose} disabled={saving}>Cancel</Button><Button color="emerald" loading={saving} onClick={() => void save()}>Save page</Button></Group></Stack></Modal>;
}