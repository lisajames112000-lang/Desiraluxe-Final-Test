import React, { useState } from 'react';
import { Alert, Button, Container, Group, Text, TextInput, Textarea, Title } from '@mantine/core';
import { CheckCircle2Icon, MailIcon, MapPinIcon, PhoneIcon } from 'lucide-react';
import { useStore } from '../contexts/StoreContext';
import { useDocumentMeta } from '../hooks/useDocumentMeta';
import { apiRequest, isRecordedAcknowledgement } from '../services/api';
import { BreadcrumbsNav } from '../components/common/BreadcrumbsNav';

export function Contact() {
  const { brandSettings, isPreviewMode } = useStore();
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '', company: '' });
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [error, setError] = useState('');
  useDocumentMeta('Contact Desiraluxe', 'Send an enquiry to Desiraluxe.');
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setStatus('sending');setError('');
    try {await apiRequest('/api/contact', { method: 'POST', body: JSON.stringify(form) }, false, isRecordedAcknowledgement);setStatus('sent');}
    catch (cause) {setStatus('error');setError(cause instanceof Error ? cause.message : 'The enquiry could not be recorded.');}
  };
  return <main className="py-10 sm:py-16"><Container size={1100}><BreadcrumbsNav items={[{ label: 'Home', href: '/' }, { label: 'Contact' }]} /><div className="grid overflow-hidden rounded-[2rem] border border-line bg-white shadow-soft lg:grid-cols-2"><div className="relative min-h-[420px] overflow-hidden bg-emerald-forest p-8 text-white sm:p-12"><img src="/dfc2b7d5-27a8-4748-9c2b-c55d22eca961.jpg" alt="" className="absolute inset-0 h-full w-full object-cover opacity-25" /><div className="relative"><Text size="xs" tt="uppercase" fw={700} c="#D9C69E" lts="0.16em">We’re here to help</Text><Title order={1} mt={8} c="white" className="!text-4xl sm:!text-5xl">Let’s talk.</Title><Text c="rgba(255,255,255,.75)" mt="lg" lh={1.7}>Send an enquiry to the Desiraluxe owner workspace.</Text><div className="mt-10 space-y-5">{brandSettings.contactEmail && <Group><MailIcon size={18} /><Text>{brandSettings.contactEmail}</Text></Group>}{brandSettings.contactPhone && <Group><PhoneIcon size={18} /><Text>{brandSettings.contactPhone}</Text></Group>}{brandSettings.contactAddress && <Group><MapPinIcon size={18} /><Text>{brandSettings.contactAddress}</Text></Group>}</div></div></div><div className="p-8 sm:p-12"><Title order={2}>Send a message</Title>{status === 'sent' ? <Alert mt="xl" color="green" icon={<CheckCircle2Icon />} title="Enquiry recorded">Your message was saved for owner review. Email delivery is not claimed.</Alert> : <form onSubmit={submit} className="mt-6 space-y-4"><TextInput label="Name" required value={form.name} onChange={(event) => setForm({ ...form, name: event.currentTarget.value })} /><TextInput label="Email" type="email" required value={form.email} onChange={(event) => setForm({ ...form, email: event.currentTarget.value })} /><TextInput label="Subject" required value={form.subject} onChange={(event) => setForm({ ...form, subject: event.currentTarget.value })} /><Textarea label="Message" required minRows={5} value={form.message} onChange={(event) => setForm({ ...form, message: event.currentTarget.value })} /><div className="hidden" aria-hidden="true"><TextInput label="Company" tabIndex={-1} autoComplete="off" value={form.company} onChange={(event) => setForm({ ...form, company: event.currentTarget.value })} /></div>{status === 'error' && <Alert color="red" role="alert">{error} Your message remains in the form.</Alert>}{isPreviewMode && <Alert color="yellow">Contact persistence requires the configured server environment.</Alert>}<Button type="submit" color="emerald" fullWidth loading={status === 'sending'} disabled={isPreviewMode}>Record enquiry</Button><Text size="xs" c="dimmed">This records the enquiry in the private owner workspace; it does not claim email delivery.</Text></form>}</div></div></Container></main>;
}