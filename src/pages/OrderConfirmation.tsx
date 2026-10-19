import React from 'react';
import { Alert, Button, Container, Group, Loader, Paper, Stack, Text, ThemeIcon, Title } from '@mantine/core';
import { CheckCircle2Icon, MapPinIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useGuestOrder } from '../hooks/useGuestOrder';
import { useDocumentMeta } from '../hooks/useDocumentMeta';
import { formatPKR } from '../utils/money';

export function OrderConfirmation() {
  const token = sessionStorage.getItem('desiraluxe.lastOrderToken') || '';
  const { order, loading, error } = useGuestOrder(token);
  useDocumentMeta('Order confirmation | Desiraluxe', 'Your private Desiraluxe order confirmation.', true);
  return <main className="min-h-[70vh] py-16"><Container size="md">{loading && <Stack align="center"><Loader color="emerald" /><Text c="dimmed">Confirming your saved order…</Text></Stack>}{error && <Alert color="red" title="Confirmation unavailable">{error}</Alert>}{!loading && !error && !token && <Alert color="yellow" title="No recent order">The private confirmation token is available only in the browser session that placed the order.</Alert>}{order && <Stack align="center" ta="center"><ThemeIcon size={72} radius="xl" color="emerald"><CheckCircle2Icon size={36} /></ThemeIcon><div><Text size="xs" tt="uppercase" fw={700} c="emerald.6" lts="0.16em">Order recorded</Text><Title order={1} mt={6}>{order.reference}</Title></div><Text c="dimmed" maw={620}>Your order was saved. Any submitted payment reference still requires owner review.</Text><Paper withBorder radius="xl" p="xl" w="100%" maw={620}><Group justify="space-between"><div><Text size="xs" c="dimmed">Amount</Text><Text fw={700}>{formatPKR(order.total)}</Text></div><div><Text size="xs" c="dimmed">Payment</Text><Text fw={700} tt="capitalize">{order.paymentState.replace('_', ' ')}</Text></div><div><Text size="xs" c="dimmed">Fulfillment</Text><Text fw={700} tt="capitalize">{order.fulfillmentState.replace('_', ' ')}</Text></div></Group></Paper><Group><Button component={Link} to="/track-order" color="emerald" leftSection={<MapPinIcon size={17} />}>Track this order</Button><Button color="emerald" variant="light" onClick={() => window.dispatchEvent(new CustomEvent('desiraluxe:support-order', { detail: { orderReference: order.reference, orderAccessToken: token } }))}>Chat about this order</Button><Button component={Link} to="/shop" variant="outline" color="emerald">Continue shopping</Button></Group></Stack>}</Container></main>;
}