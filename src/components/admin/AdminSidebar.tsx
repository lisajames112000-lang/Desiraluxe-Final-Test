import React from 'react';
import { Button, Divider, Text } from '@mantine/core';
import { CreditCardIcon, FileTextIcon, HistoryIcon, ImageIcon, InboxIcon, KeyRoundIcon, LayoutDashboardIcon, MessageCircleIcon, LogOutIcon, MegaphoneIcon, PackageIcon, SettingsIcon, ShoppingBagIcon, TagsIcon } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { useAdminAuth } from '../../contexts/AdminAuthContext';
import { Logo } from '../brand/Logo';

const links = [
['Dashboard', '/admin/dashboard', LayoutDashboardIcon],
['Products', '/admin/products', PackageIcon],
['Categories', '/admin/categories', TagsIcon],
['Orders', '/admin/orders', ShoppingBagIcon],
['Payment methods', '/admin/payments', CreditCardIcon],
['Hero banners', '/admin/banners', ImageIcon],
['Promotional popups', '/admin/popups', MegaphoneIcon],
['Branding & layout', '/admin/settings', SettingsIcon],
['Pages & content', '/admin/content', FileTextIcon],
['Enquiries', '/admin/enquiries', InboxIcon],
['Chat support', '/admin/support', MessageCircleIcon],
['Data & audit', '/admin/data', HistoryIcon],
['Account & password', '/admin/account', KeyRoundIcon]] as
const;

export function AdminSidebar({ onNavigate }: {onNavigate?: () => void;}) {
  const { user, logout } = useAdminAuth();
  return <aside className="flex h-full flex-col bg-emerald-forest p-4 text-white"><div className="px-2 py-3"><Logo variant="light" to="/admin/dashboard" /></div><Text size="xs" c="rgba(255,255,255,.58)" px="sm" mt="md" className="truncate">{user?.email}</Text><nav aria-label="Administration" className="mt-5 flex flex-1 flex-col gap-1">{links.map(([label, href, Icon]) => <NavLink key={href} to={href} onClick={onNavigate} className={({ isActive }) => `flex min-h-11 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium no-underline transition-colors ${isActive ? 'bg-white text-emerald-forest shadow-sm' : 'text-white/75 hover:bg-white/10 hover:text-white'}`}><Icon size={17} aria-hidden="true" />{label}</NavLink>)}</nav><Divider color="rgba(255,255,255,.14)" my="md" /><Button variant="subtle" color="gray" c="white" justify="start" leftSection={<LogOutIcon size={17} />} onClick={() => void logout()}>Sign out</Button></aside>;
}