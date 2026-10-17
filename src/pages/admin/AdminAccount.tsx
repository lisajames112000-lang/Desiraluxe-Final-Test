import React, { useState } from 'react';
import { Alert, Button, Paper, PasswordInput, Stack, Text, Title } from '@mantine/core';
import { KeyRoundIcon } from 'lucide-react';
import { useAdminAuth } from '../../contexts/AdminAuthContext';

export function AdminAccount() {
  const { user, changePassword } = useAdminAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [nextPassword, setNextPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ok: boolean;message: string;} | null>(null);

  const mismatch = confirmPassword.length > 0 && nextPassword !== confirmPassword;
  const tooShort = nextPassword.length > 0 && nextPassword.length < 8;
  const canSubmit = !!currentPassword && nextPassword.length >= 8 && nextPassword === confirmPassword && nextPassword !== currentPassword;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!canSubmit) return;
    setSaving(true);
    setFeedback(null);
    try {
      await changePassword(currentPassword, nextPassword);
      setCurrentPassword('');setNextPassword('');setConfirmPassword('');
      setFeedback({ ok: true, message: 'Password changed. Use the new password next time you sign in.' });
    } catch (error) {
      setFeedback({ ok: false, message: error instanceof Error ? error.message : 'The password could not be changed.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <Title order={1}>Account & password</Title>
      <Text c="dimmed">Signed in as {user?.email}. Change your owner password here.</Text>
      <Paper withBorder radius="xl" p="lg" mt="lg" maw={520}>
        <form onSubmit={submit} noValidate>
          <Stack>
            <Title order={3}>Change password</Title>
            <PasswordInput label="Current password" autoComplete="current-password" value={currentPassword} onChange={(event) => setCurrentPassword(event.currentTarget.value)} required />
            <PasswordInput label="New password" description="At least 8 characters" autoComplete="new-password" value={nextPassword} onChange={(event) => setNextPassword(event.currentTarget.value)} error={tooShort ? 'Use at least 8 characters.' : undefined} required />
            <PasswordInput label="Confirm new password" autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.currentTarget.value)} error={mismatch ? 'Passwords do not match.' : undefined} required />
            {feedback && <Alert color={feedback.ok ? 'green' : 'red'} role={feedback.ok ? 'status' : 'alert'} withCloseButton onClose={() => setFeedback(null)}>{feedback.message}</Alert>}
            <Button type="submit" color="emerald" leftSection={<KeyRoundIcon size={17} />} loading={saving} disabled={!canSubmit}>Update password</Button>
          </Stack>
        </form>
      </Paper>
    </div>);

}