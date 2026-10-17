import React from 'react';
import { ActionIcon, Badge, Group, Menu, Text } from '@mantine/core';
import { ExternalLinkIcon, LogOutIcon, MenuIcon, UserRoundIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAdminAuth } from '../../contexts/AdminAuthContext';

interface AdminHeaderProps {title?: string;onMenu: () => void;}

export function AdminHeader({ title = 'Owner administration', onMenu }: AdminHeaderProps) {
  const { user, logout } = useAdminAuth();
  return (
    <header className="sticky top-0 z-30 flex min-h-16 items-center justify-between border-b border-line bg-white/95 px-4 py-2 backdrop-blur sm:px-6">
      <Group><ActionIcon variant="subtle" color="emerald" onClick={onMenu} aria-label="Open admin navigation" className="lg:hidden"><MenuIcon size={20} /></ActionIcon><div><Text fw={700}>{title}</Text><Text size="xs" c="dimmed" className="hidden sm:block">Secure Firebase owner workspace</Text></div></Group>
      <Group gap="xs"><Badge color="green" variant="light">Authorized</Badge><ActionIcon component={Link} to="/" target="_blank" variant="subtle" color="emerald" aria-label="View storefront"><ExternalLinkIcon size={18} /></ActionIcon><Menu position="bottom-end" shadow="md"><Menu.Target><ActionIcon variant="light" color="emerald" aria-label="Open admin profile menu"><UserRoundIcon size={18} /></ActionIcon></Menu.Target><Menu.Dropdown><Menu.Label>{user?.email || 'Authorized owner'}</Menu.Label><Menu.Item color="red" leftSection={<LogOutIcon size={15} />} onClick={() => void logout()}>Sign out</Menu.Item></Menu.Dropdown></Menu></Group>
    </header>);

}