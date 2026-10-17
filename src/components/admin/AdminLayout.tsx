import React, { useState } from 'react';
import { Alert, Center, Drawer, Loader, Text } from '@mantine/core';
import { ServerOffIcon } from 'lucide-react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAdminAuth } from '../../contexts/AdminAuthContext';
import { useScrollToTop } from '../../hooks/useScrollToTop';
import { AdminHeader } from './AdminHeader';
import { AdminSidebar } from './AdminSidebar';

export function AdminLayout() {
  const { isAdmin, loading } = useAdminAuth();
  const [opened, setOpened] = useState(false);
  const location = useLocation();
  const previewWithoutApi = typeof window !== 'undefined' && /(^|\.)magicpatterns\.(app|com)$/.test(window.location.hostname);
  useScrollToTop();

  if (loading) return <Center mih="100vh"><div className="text-center"><Loader color="emerald" /><Text mt="sm" c="dimmed">Verifying owner access…</Text></div></Center>;
  if (!isAdmin) return <Navigate to="/admin" replace state={{ from: location.pathname }} />;

  return (
    <div className="min-h-screen bg-[#F5F8F6]">
      <div className="fixed inset-y-0 left-0 hidden w-64 lg:block"><AdminSidebar /></div>
      <div className="lg:pl-64"><AdminHeader onMenu={() => setOpened(true)} /><main className="p-4 sm:p-6 lg:p-8">{previewWithoutApi && <Alert mb="lg" color="blue" variant="light" icon={<ServerOffIcon size={18} />} title="Preview backend unavailable">Product, order, accounting, media, and enquiry mutations require the separately deployed Vercel API. This Magic Patterns preview only runs the Vite client.</Alert>}<Outlet /></main></div>
      <Drawer opened={opened} onClose={() => setOpened(false)} padding={0} size={280} withCloseButton={false}><AdminSidebar onNavigate={() => setOpened(false)} /></Drawer>
    </div>);

}