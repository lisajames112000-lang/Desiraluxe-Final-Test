import { ReceiptUpload } from '../components/storefront/ReceiptUpload';
import React, { useMemo, useRef, useState } from 'react';
import { Alert, Button, Checkbox, Container, Divider, Group, Radio, Select, Stack, Text, TextInput, Textarea, Title } from '@mantine/core';
import { AlertTriangleIcon, CheckCircle2Icon, LockKeyholeIcon } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useStore } from '../contexts/StoreContext';
import { useDocumentMeta } from '../hooks/useDocumentMeta';
import { formatPKR } from '../utils/money';
import type { ShippingDetails } from '../types/order';

interface FormState extends ShippingDetails {paymentMethod: string;transactionReference: string;}
const initial: FormState = { fullName: '', whatsapp: '+92 ', address: '', city: '', postalCode: '', country: 'Pakistan', note: '', paymentMethod: '', transactionReference: '' };

export function Checkout() {
  const { cart, cartSubtotal, createOrder, paymentMethods, brandSettings, isPreviewMode } = useStore();
  const navigate = useNavigate();
  const [receiptId, setReceiptId] = useState('');
  const receiptOwnerToken = useRef(crypto.randomUUID()+crypto.randomUUID());
  const [form, setForm] = useState(initial);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [accepted, setAccepted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const idempotencyKey = useRef(crypto.randomUUID());
  useDocumentMeta('Checkout | Desiraluxe', 'Complete a secure Desiraluxe guest checkout.', true);
  const configured = useMemo(() => paymentMethods.filter((method) => method.enabled && method.accountTitle && method.accountNumber && method.instructions), [paymentMethods]);
  const shipping = cartSubtotal >= (brandSettings.freeShippingThreshold ?? 10000) ? 0 : brandSettings.shippingFee ?? 500;
  const method = configured.find((candidate) => candidate.id === form.paymentMethod);

  const validate = () => {
    const next: typeof errors = {};
    if (form.fullName.trim().length < 2) next.fullName = 'Enter your full name.';
    if (!/^\+\d[\d\s-]{7,20}$/.test(form.whatsapp.trim())) next.whatsapp = 'Include a country code, for example +92.';
    if (form.address.trim().length < 8) next.address = 'Enter a complete shipping address.';
    if (form.city.trim().length < 2) next.city = 'Enter a city or region.';
    if (form.country !== 'Pakistan') next.country = 'Desiraluxe currently supports delivery within Pakistan only.';
    if (!form.paymentMethod) next.paymentMethod = 'Select an available payment method.';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitError('');
    if (!receiptId) {setSubmitError('Upload your payment receipt image before placing the order.');return;}
    if (!validate() || !accepted || !cart.length || !method) return;
    setSubmitting(true);
    try {
      const result = await createOrder({ shipping: { fullName: form.fullName.trim(), whatsapp: form.whatsapp.trim(), address: form.address.trim(), city: form.city.trim(), postalCode: form.postalCode?.trim(), country: 'Pakistan', note: form.note?.trim() }, paymentMethodId: method.id, receiptId, receiptOwnerToken: receiptOwnerToken.current, transactionReference: form.transactionReference.trim(), idempotencyKey: idempotencyKey.current });
      sessionStorage.setItem('desiraluxe.lastOrderToken', result.accessToken);
      navigate('/order-confirmation', { replace: true });
    } catch (cause) {
      setSubmitError(cause instanceof Error ? cause.message : 'Order creation failed. Your cart and details have been preserved.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!cart.length) return <main className="py-20"><Container size="sm"><Alert icon={<AlertTriangleIcon />} color="yellow" title="Your cart is empty">Add available products before checkout.</Alert><Button component={Link} to="/shop" color="emerald" mt="lg">Browse products</Button></Container></main>;
  return <main className="py-8 sm:py-12"><Container size={1150}><Title order={1} className="!text-4xl sm:!text-5xl">Guest checkout</Title><Text c="dimmed" mt="sm">Shipping is currently limited to Pakistan. Prices and stock are revalidated securely when you place the order.</Text>{isPreviewMode && <Alert color="yellow" mt="lg" title="Checkout unavailable in demo mode">Connect Firebase and configure at least one payment method to accept orders.</Alert>}<form onSubmit={submit} noValidate className="mt-8 grid gap-8 lg:grid-cols-[1fr_370px]">
    <Stack gap="xl"><section className="rounded-2xl border border-line bg-white p-5 sm:p-7"><Title order={3}>1. Shipping details</Title><div className="mt-5 grid gap-4 sm:grid-cols-2"><TextInput label="Full name" required autoComplete="name" value={form.fullName} error={errors.fullName} onChange={(event) => setForm({ ...form, fullName: event.currentTarget.value })} /><TextInput label="WhatsApp number" required autoComplete="tel" value={form.whatsapp} error={errors.whatsapp} description="Include country code" onChange={(event) => setForm({ ...form, whatsapp: event.currentTarget.value })} /><Textarea label="Shipping address" required autoComplete="street-address" value={form.address} error={errors.address} minRows={3} className="sm:col-span-2" onChange={(event) => setForm({ ...form, address: event.currentTarget.value })} /><TextInput label="City / region" required value={form.city} error={errors.city} onChange={(event) => setForm({ ...form, city: event.currentTarget.value })} /><TextInput label="Postal code (optional)" autoComplete="postal-code" value={form.postalCode} onChange={(event) => setForm({ ...form, postalCode: event.currentTarget.value })} /><Select label="Country" required value={form.country} error={errors.country} data={['Pakistan']} onChange={(country) => setForm({ ...form, country: country || '' })} /><Textarea label="Order note (optional)" value={form.note} onChange={(event) => setForm({ ...form, note: event.currentTarget.value })} /></div></section>
    <section className="rounded-2xl border border-line bg-white p-5 sm:p-7"><Title order={3}>2. Manual payment</Title>{configured.length ? <><Alert icon={<LockKeyholeIcon size={18} />} color="emerald" mt="md" title="Manual review">A receipt image is required. Submitting it does not verify payment. The owner must approve payment before fulfillment begins.</Alert><Radio.Group mt="lg" value={form.paymentMethod} onChange={(paymentMethod) => setForm({ ...form, paymentMethod })} error={errors.paymentMethod}>{configured.map((candidate) => <Radio.Card key={candidate.id} value={candidate.id} withBorder radius="md" p="md" mt="sm"><Group wrap="nowrap"><Radio.Indicator /><div><Text fw={700}>{candidate.label}</Text><Text size="xs" c="dimmed">{candidate.country} · {candidate.currency}</Text></div></Group></Radio.Card>)}</Radio.Group>{method && <div className="mt-4 rounded-xl bg-sage p-4"><Text fw={700}>{method.accountTitle}</Text><Text size="sm">{method.accountNumber}</Text><Text size="sm" c="dimmed" mt="xs">{method.instructions}</Text></div>}<TextInput label="Transaction / reference ID (optional)" mt="lg" value={form.transactionReference} onChange={(event) => setForm({ ...form, transactionReference: event.currentTarget.value })} /><ReceiptUpload ownerToken={receiptOwnerToken.current} onReady={setReceiptId} disabled={submitting} /></> : <Alert color="yellow" mt="md" title="No payment methods available">The owner has not configured an enabled manual payment account.</Alert>}</section></Stack>
    <aside className="h-fit rounded-2xl border border-line bg-white p-6 shadow-card lg:sticky lg:top-28"><Title order={3}>Order summary</Title><Stack mt="lg" gap="md">{cart.map((item) => <Group key={`${item.productId}-${item.variantId}`} justify="space-between" align="start"><div><Text size="sm" fw={600}>{item.name}</Text><Text size="xs" c="dimmed">Qty {item.quantity}{item.variantLabel ? ` · ${item.variantLabel}` : ''}</Text></div><Text size="sm" fw={600}>{formatPKR(item.price * item.quantity)}</Text></Group>)}<Divider /><Group justify="space-between"><Text c="dimmed">Subtotal</Text><Text>{formatPKR(cartSubtotal)}</Text></Group><Group justify="space-between"><Text c="dimmed">Shipping</Text><Text>{shipping ? formatPKR(shipping) : 'Free'}</Text></Group><Divider /><Group justify="space-between"><Text fw={700}>Estimated total</Text><Text fw={800} c="emerald.8" size="lg">{formatPKR(cartSubtotal + shipping)}</Text></Group></Stack><Checkbox mt="xl" checked={accepted} onChange={(event) => setAccepted(event.currentTarget.checked)} label="I confirm these shipping details and understand payment is manually reviewed." color="emerald" />{submitError && <Alert color="red" mt="md" role="alert">{submitError} Your cart and form were not cleared.</Alert>}<Button type="submit" color="emerald" size="lg" fullWidth mt="lg" loading={submitting} disabled={!receiptId || !accepted || !configured.length || isPreviewMode} leftSection={<CheckCircle2Icon size={18} />}>Place order securely</Button></aside>
  </form></Container></main>;
}