import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Badge, Button, Divider, Drawer, Group, NumberInput, Select, Stack, Text, TextInput, Textarea, Title } from '@mantine/core';
import { MessageCircleIcon, SparklesIcon } from 'lucide-react';
import type { FulfillmentState, Order, PaymentState } from '../../types/order';
import { formatPKR } from '../../utils/money';
import { canTransitionFulfillment, canTransitionPayment } from '../../utils/orderState';
import { buildOrderStatusMessage, buildWhatsappLink } from '../../utils/whatsapp';
import { useStore } from '../../contexts/StoreContext';

export function OrderDetailDrawer({ order, onClose }: {order: Order | null;onClose: () => void;}) {
  const { updateOrderState, recordRefund, updateTracking, markContacted, updateOrder } = useStore();
  const [carrier, setCarrier] = useState('');const [trackingId, setTrackingId] = useState('');const [trackingUrl, setTrackingUrl] = useState('');const [statusNote, setStatusNote] = useState('');const [notes, setNotes] = useState('');const [refundAmount, setRefundAmount] = useState<number | ''>('');const [refundReference, setRefundReference] = useState('');const [refundNote, setRefundNote] = useState('');const [refundRequestId, setRefundRequestId] = useState(() => crypto.randomUUID());const [feedback, setFeedback] = useState<{ok: boolean;message: string;} | null>(null);const [saving, setSaving] = useState(false);
  useEffect(() => {setCarrier(order?.tracking?.carrier || '');setTrackingId(order?.tracking?.trackingId || '');setTrackingUrl(order?.tracking?.trackingUrl || '');setStatusNote(order?.tracking?.statusNote || '');setNotes(order?.internalNotes || '');setRefundAmount('');setRefundReference('');setRefundNote('');setRefundRequestId(crypto.randomUUID());setFeedback(null);}, [order?.id]);
  const paymentOptions = useMemo(() => order ? (['awaiting_proof', 'under_review', 'approved', 'rejected', 'refund_required'] as PaymentState[]).filter((state) => canTransitionPayment(order.paymentState, state)).map((state) => ({ value: state, label: state.replace('_', ' ') })) : [], [order]);
  const fulfillmentOptions = useMemo(() => order ? (['pending', 'processing', 'dispatched', 'in_transit', 'delivered', 'cancelled'] as FulfillmentState[]).filter((state) => canTransitionFulfillment(order.fulfillmentState, state) && (order.paymentState === 'approved' || !['dispatched', 'in_transit', 'delivered'].includes(state))).map((state) => ({ value: state, label: state.replace('_', ' ') })) : [], [order]);
  if (!order) return <Drawer opened={false} onClose={onClose} />;
  const whatsapp = buildWhatsappLink(order.shipping.whatsapp, buildOrderStatusMessage(order));
  const generateTrackingId = () => {
    const suffix = crypto.randomUUID().replaceAll('-', '').slice(0, 10).toUpperCase();
    setTrackingId(`DXL-${suffix}`);
    setFeedback({ ok: true, message: 'A unique Desiraluxe tracking ID was generated. Save tracking to publish it to the customer.' });
  };
  const saveTracking = async () => {
    if (!trackingId.trim()) {setFeedback({ ok: false, message: 'Enter or generate a tracking ID before saving.' });return;}
    setSaving(true);const result = await updateTracking(order.id, { carrier: carrier.trim(), trackingId: trackingId.trim(), trackingUrl: trackingUrl.trim(), statusNote: statusNote.trim() });setSaving(false);setFeedback(result);
  };
  const saveNotes = async () => {setSaving(true);const result = await updateOrder({ ...order, internalNotes: notes });setSaving(false);setFeedback(result);};
  const saveRefund = async () => {
    const amount = Number(refundAmount);
    if (!Number.isSafeInteger(amount) || amount <= 0 || !refundReference.trim() || !refundNote.trim()) {setFeedback({ ok: false, message: 'Enter a whole PKR amount, settlement reference, and note.' });return;}
    setSaving(true);
    const result = await recordRefund(order.id, amount, refundReference.trim(), refundNote.trim(), refundRequestId, order.updatedAt);
    setSaving(false);setFeedback(result);
    if (result.ok) {setRefundAmount('');setRefundReference('');setRefundNote('');setRefundRequestId(crypto.randomUUID());}
  };
  return <Drawer opened={!!order} onClose={onClose} title="Order review" position="right" size="lg"><Stack>
    <div><Badge color={order.isSampleOrder ? 'yellow' : 'green'} variant="light">{order.isSampleOrder ? 'Sample order' : 'Live order'}</Badge><Title order={2} mt="xs">{order.reference}</Title><Text size="sm" c="dimmed">Created {new Date(order.createdAt).toLocaleString()}</Text></div>
    <Alert color="yellow" title="Payment evidence policy">A submitted transaction reference is not verified payment. Review manually before approving.</Alert>
    <section><Text fw={700}>Customer & shipping</Text><Text mt="xs">{order.shipping.fullName}</Text><Text size="sm" c="dimmed">{order.shipping.whatsapp}<br />{order.shipping.address}, {order.shipping.city}, {order.shipping.country}</Text><Text size="xs" c="dimmed" mt="xs">Payment reference: {order.payment.transactionReference || 'Not yet submitted'}</Text></section>
    <Divider />
    <section><Text fw={700}>Items (immutable snapshot)</Text>{order.items.map((item) => <Group key={`${item.productId}-${item.variantLabel || ''}`} justify="space-between" mt="sm"><div><Text size="sm">{item.name}</Text><Text size="xs" c="dimmed">{item.sku}{item.variantLabel ? ` · ${item.variantLabel}` : ''} · Qty {item.quantity}</Text></div><Text fw={600}>{formatPKR(item.unitPrice * item.quantity)}</Text></Group>)}<Group justify="space-between" mt="md"><Text fw={700}>Total</Text><Text fw={800} c="emerald.8">{formatPKR(order.total)}</Text></Group></section>
    <Divider />
    {feedback && <Alert color={feedback.ok ? 'green' : 'red'}>{feedback.message}</Alert>}
    <div className="grid gap-4 sm:grid-cols-2"><Select label="Payment state" value={order.paymentState} data={paymentOptions} onChange={(value) => {if (value) void updateOrderState(order.id, value as PaymentState, undefined).then(setFeedback);}} /><Select label="Fulfillment state" value={order.fulfillmentState} data={fulfillmentOptions} onChange={(value) => {if (value) void updateOrderState(order.id, undefined, value as FulfillmentState).then(setFeedback);}} /></div>
    {(order.paymentState === 'refund_required' || order.paymentState === 'refunded') && <section className="rounded-xl border border-line p-4"><Text fw={700}>Refund record</Text><Text size="sm" c="dimmed" mt={4}>Recorded: {formatPKR(order.refundAmount || 0)} of {formatPKR(order.total)}. This records a confirmed external refund; it does not move money.</Text>{order.paymentState === 'refund_required' && <Stack gap="sm" mt="md"><NumberInput label="Confirmed refund amount (whole PKR)" min={1} max={Math.max(1, order.total - (order.refundAmount || 0))} allowDecimal={false} value={refundAmount} onChange={(value) => setRefundAmount(value === '' ? '' : Number(value))} /><TextInput label="Provider / bank refund reference" value={refundReference} onChange={(event) => setRefundReference(event.currentTarget.value)} /><Textarea label="Refund note" value={refundNote} onChange={(event) => setRefundNote(event.currentTarget.value)} /><Button color="red" variant="light" loading={saving} onClick={() => void saveRefund()}>Record confirmed refund</Button></Stack>}</section>}
    <section className="rounded-xl border border-line p-4"><Group justify="space-between" mb="sm"><div><Text fw={700}>Carrier tracking</Text><Text size="xs" c="dimmed">Generate an internal ID or enter the carrier-issued number.</Text></div><Button size="xs" variant="light" color="emerald" leftSection={<SparklesIcon size={14} />} onClick={generateTrackingId}>Generate ID</Button></Group><Stack gap="sm"><TextInput label="Carrier" value={carrier} onChange={(event) => setCarrier(event.currentTarget.value)} /><TextInput label="Tracking ID" required value={trackingId} onChange={(event) => setTrackingId(event.currentTarget.value)} /><TextInput label="Carrier tracking URL" value={trackingUrl} onChange={(event) => setTrackingUrl(event.currentTarget.value)} /><Textarea label="Customer-visible status note" value={statusNote} onChange={(event) => setStatusNote(event.currentTarget.value)} /><Button variant="light" color="emerald" loading={saving} onClick={() => void saveTracking()}>Save tracking</Button></Stack></section>
    <section><Text fw={700} mb="sm">Internal notes (never shown publicly)</Text><Textarea minRows={3} value={notes} onChange={(event) => setNotes(event.currentTarget.value)} /><Button mt="sm" variant="light" color="emerald" loading={saving} onClick={() => void saveNotes()}>Save notes</Button></section>
    <Button component="a" href={whatsapp} target="_blank" rel="noreferrer" color="emerald" leftSection={<MessageCircleIcon size={17} />} onClick={() => void markContacted(order.id)}>Message on WhatsApp</Button>
    <Text size="xs" c="dimmed">Marking contacted records an admin action; it does not confirm delivery of the message.</Text>
  </Stack></Drawer>;
}