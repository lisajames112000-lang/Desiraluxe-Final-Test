import React, { useState } from 'react';
import { Alert, Button, PasswordInput, Stack, Text, TextInput, Title } from '@mantine/core';
import { LockKeyholeIcon, ShieldAlertIcon } from 'lucide-react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAdminAuth } from '../../contexts/AdminAuthContext';
import { useDocumentMeta } from '../../hooks/useDocumentMeta';
import { Logo } from '../../components/brand/Logo';

export function AdminLogin() {
  const { isAdmin, loading, state, configurationError, authenticationError, signIn, resetPassword } = useAdminAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [submitting, setSubmitting] = useState(false);
  useDocumentMeta('Owner sign in | Desiraluxe', 'Secure Desiraluxe owner administration.', true);

  if (!loading && isAdmin) return <Navigate to="/admin/dashboard" replace />;

  const login = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setNotice('');
    setSubmitting(true);
    try {
      await signIn(email, password);
      navigate('/admin/dashboard', { replace: true });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Sign-in could not be completed.');
    } finally {
      setSubmitting(false);
    }
  };

  const requestReset = async () => {
    setError('');
    setNotice('');
    try {
      await resetPassword(email);
      setNotice('If this is the authorized owner account, Firebase has sent password-reset instructions.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Password reset could not be requested.');
    }
  };

  return (
    <main className="min-h-screen bg-warmwhite p-4 sm:p-8">
      <div className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-5xl overflow-hidden rounded-[2rem] border border-line bg-white shadow-lift lg:grid-cols-[.9fr_1.1fr]">
        <div className="relative hidden overflow-hidden bg-emerald-forest p-12 text-white lg:flex lg:flex-col lg:justify-between">
          <img src="/34226e0d-d171-438a-bca1-d5f5b538116d.jpg" alt="" className="absolute inset-0 h-full w-full object-cover opacity-45" />
          <div className="relative"><Logo variant="light" /><Text mt="xl" c="rgba(255,255,255,.72)">Secure catalog, orders, media, content, and store settings in one owner workspace.</Text></div>
          <div className="relative"><Title order={2} c="white" className="!text-4xl">Own every detail.</Title><Text c="rgba(255,255,255,.65)" mt="sm">Access requires Firebase Authentication and a trusted admin claim.</Text></div>
        </div>
        <div className="flex items-center p-7 sm:p-12">
          <Stack w="100%" maw={440} mx="auto">
            <div className="lg:hidden"><Logo /></div>
            <div><Text size="xs" fw={700} tt="uppercase" c="emerald.6" lts="0.16em">Owner workspace</Text><Title order={1} mt={6}>Welcome back</Title><Text c="dimmed" mt="sm">Sign in with the existing authorized Firebase owner account.</Text></div>
            {configurationError && <Alert color="yellow" icon={<ShieldAlertIcon size={18} />} title="Owner setup required">{configurationError} Add the complete public Firebase Web configuration, then rebuild or redeploy.</Alert>}
            {!configurationError && authenticationError && !error && <Alert color={state === 'permission-denied' ? 'orange' : 'red'} icon={<ShieldAlertIcon size={18} />} title={state === 'permission-denied' ? 'Admin permission denied' : 'Authentication unavailable'} role="alert">{authenticationError}</Alert>}
            <form onSubmit={login} noValidate>
              <Stack>
                <TextInput label="Owner email" type="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.currentTarget.value)} required disabled={!!configurationError} />
                <PasswordInput label="Password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.currentTarget.value)} required disabled={!!configurationError} />
                <Button type="submit" color="emerald" size="lg" leftSection={<LockKeyholeIcon size={18} />} loading={submitting || loading || state === 'verifying-permission'} disabled={!!configurationError}>Secure sign in</Button>
                <Button type="button" variant="subtle" color="emerald" onClick={requestReset} disabled={!!configurationError || submitting}>Reset password</Button>
              </Stack>
            </form>
            {error && <Alert color="red" icon={<ShieldAlertIcon size={18} />} title="Sign-in failed" role="alert">{error}</Alert>}
            {notice && <Alert color="green" title="Request received" role="status">{notice}</Alert>}
          </Stack>
        </div>
      </div>
    </main>);

}