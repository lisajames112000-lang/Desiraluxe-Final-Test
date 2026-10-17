import React from 'react';
import { Badge, Button, Group, Paper, Progress, Stack, Table, Text, ThemeIcon, Title } from '@mantine/core';
import { AlertTriangleIcon, BanknoteIcon, BoxesIcon, Clock3Icon, PackageCheckIcon, PackageIcon, RotateCcwIcon, ShoppingBagIcon, TrendingUpIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useStore } from '../../contexts/StoreContext';
import { useDocumentMeta } from '../../hooks/useDocumentMeta';
import { formatPKR } from '../../utils/money';

export function AdminDashboard() {
  const { products, orders, categories, accountingPeriods } = useStore();
  useDocumentMeta('Admin dashboard | Desiraluxe', 'Private Desiraluxe owner dashboard.', true);
  const period = accountingPeriods.slice().sort((left, right) => {
    const leftOpen = !left.endedAt;const rightOpen = !right.endedAt;
    if (leftOpen !== rightOpen) return leftOpen ? -1 : 1;
    return Date.parse(right.startedAt) - Date.parse(left.startedAt);
  })[0];
  const currentOrders = orders.filter((order) => !period || order.createdAt >= period.startedAt && (!period.endedAt || order.createdAt < period.endedAt));
  const liveOrders = currentOrders.filter((order) => !order.isSampleOrder);
  const recognizedOrders = liveOrders.filter((order) => ['approved', 'refund_required', 'refunded'].includes(order.paymentState));
  const delivered = liveOrders.filter((o) => o.fulfillmentState === 'delivered');
  const metrics = {
    active: products.filter((p) => p.isPublished).length,
    units: products.reduce((s, p) => s + p.stock, 0),
    value: products.reduce((s, p) => s + p.stock * p.price, 0),
    pending: liveOrders.filter((o) => ['awaiting_proof', 'under_review'].includes(o.paymentState)).length,
    revenue: recognizedOrders.reduce((sum, order) => sum + order.total - (order.refundAmount || 0), 0),
    sold: recognizedOrders.reduce((sum, order) => sum + order.items.reduce((quantity, item) => quantity + item.quantity, 0), 0),
    fulfilled: delivered.length,
    refunds: recognizedOrders.reduce((sum, order) => sum + (order.refundAmount || 0), 0),
    low: products.filter((p) => p.isPublished && p.stock <= 10).length
  };
  const cards = [
  ['Active products', metrics.active.toLocaleString(), PackageIcon, 'emerald'],
  ['Inventory units', metrics.units.toLocaleString(), BoxesIcon, 'blue'],
  ['Inventory retail value', formatPKR(metrics.value), BanknoteIcon, 'teal'],
  ['Pending reviews', metrics.pending.toString(), Clock3Icon, 'yellow'],
  ['Net recognized revenue', formatPKR(metrics.revenue), TrendingUpIcon, 'green'],
  ['Units sold', metrics.sold.toString(), ShoppingBagIcon, 'indigo'],
  ['Fulfilled orders', metrics.fulfilled.toString(), PackageCheckIcon, 'cyan'],
  ['Refund totals', formatPKR(metrics.refunds), RotateCcwIcon, 'red']] as
  const;
  const chartData = currentOrders.slice().reverse().map((order, index) => ({ name: `Order ${index + 1}`, revenue: ['approved', 'refund_required', 'refunded'].includes(order.paymentState) ? order.total - (order.refundAmount || 0) : 0 }));
  const topCats = categories.map((c) => ({ ...c, count: products.filter((p) => p.categorySlugs.includes(c.slug)).length })).sort((a, b) => b.count - a.count).slice(0, 5);
  return <div><Group justify="space-between" align="start"><div><Text size="xs" tt="uppercase" fw={700} c="emerald.6" lts="0.16em">Store overview</Text><Title order={1} mt={5}>Dashboard</Title><Text c="dimmed" mt={5}>Correctly separated sample inventory, revenue, and order metrics.</Text></div><Badge color="yellow" size="lg">Sample metrics</Badge></Group><Group mt="lg" gap="xs"><Text size="sm" fw={600}>Reporting period:</Text><Text size="sm" c="dimmed">{period?.label || 'All time'} · from {period ? new Date(period.startedAt).toLocaleDateString() : 'start'}</Text></Group><div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{cards.map(([label, value, Icon, color]) => <Paper key={label} withBorder radius="xl" p="lg"><Group justify="space-between" align="start"><ThemeIcon color={color} variant="light" radius="xl" size={44}><Icon size={20} /></ThemeIcon>{label === 'Active products' && <Badge color="yellow" variant="light">Preview</Badge>}</Group><Text size="xs" c="dimmed" mt="lg">{label}</Text><Text fw={800} size="xl" mt={3}>{value}</Text></Paper>)}</div><div className="mt-5 grid gap-5 xl:grid-cols-3"><Paper withBorder radius="xl" p="lg" className="xl:col-span-2"><Group justify="space-between"><div><Text fw={700}>Net recognized revenue</Text><Text size="xs" c="dimmed">Approved order totals less recorded refunds in the current period</Text></div><Text fw={800} c="emerald.8">{formatPKR(metrics.revenue)}</Text></Group><div className="mt-5 h-64"><ResponsiveContainer width="100%" height="100%"><LineChart data={chartData}><XAxis dataKey="name" hide /><YAxis hide /><Tooltip formatter={(v) => formatPKR(Number(v))} /><Line type="monotone" dataKey="revenue" stroke="#0B4938" strokeWidth={3} dot={{ r: 4, fill: '#BDA679', strokeWidth: 0 }} /></LineChart></ResponsiveContainer></div></Paper><Paper withBorder radius="xl" p="lg"><Group justify="space-between"><Text fw={700}>Inventory attention</Text><Badge color={metrics.low ? 'red' : 'green'}>{metrics.low} low stock</Badge></Group><Stack mt="lg">{topCats.map((c) => <div key={c.id}><Group justify="space-between" mb={5}><Text size="sm">{c.name}</Text><Text size="xs" c="dimmed">{c.count}</Text></Group><Progress value={c.count / 10 * 100} color="emerald" size="sm" /></div>)}</Stack><Button component={Link} to="/admin/products" variant="light" color="emerald" fullWidth mt="xl">Manage inventory</Button></Paper></div><Paper withBorder radius="xl" p="lg" mt="lg"><Group justify="space-between" mb="md"><div><Text fw={700}>Recent orders</Text><Text size="xs" c="dimmed">All demonstration records are labelled samples</Text></div><Button component={Link} to="/admin/orders" variant="subtle" color="emerald" size="xs">View all</Button></Group><Table.ScrollContainer minWidth={700}><Table striped highlightOnHover><Table.Thead><Table.Tr><Table.Th>Order</Table.Th><Table.Th>Customer</Table.Th><Table.Th>Total</Table.Th><Table.Th>Payment</Table.Th><Table.Th>Fulfillment</Table.Th><Table.Th>Created</Table.Th></Table.Tr></Table.Thead><Table.Tbody>{orders.slice(0, 8).map((o) => <Table.Tr key={o.id}><Table.Td><Text size="sm" fw={700}>{o.reference}</Text><Badge color="yellow" variant="light" size="xs">Sample</Badge></Table.Td><Table.Td>{o.shipping.fullName}</Table.Td><Table.Td>{formatPKR(o.total)}</Table.Td><Table.Td><Badge color={o.paymentState === 'approved' ? 'green' : 'yellow'}>{o.paymentState.replace('_', ' ')}</Badge></Table.Td><Table.Td><Badge color={o.fulfillmentState === 'delivered' ? 'green' : 'blue'} variant="light">{o.fulfillmentState.replace('_', ' ')}</Badge></Table.Td><Table.Td>{new Date(o.createdAt).toLocaleDateString()}</Table.Td></Table.Tr>)}</Table.Tbody></Table></Table.ScrollContainer></Paper><div className="mt-5 flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"><AlertTriangleIcon size={20} className="shrink-0" /><div><strong>Inventory retail value is not revenue or profit.</strong> Profit is intentionally not shown because reliable product cost data is not available for the sample catalog.</div></div></div>;
}