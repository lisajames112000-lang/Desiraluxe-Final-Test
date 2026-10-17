import React from 'react';
import { Button, Stack, Text, ThemeIcon, Title } from '@mantine/core';
import { PackageSearchIcon } from 'lucide-react';
import { Link } from 'react-router-dom';

interface EmptyStateProps {
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
}

export function EmptyState({ title, description, actionLabel, actionHref }: EmptyStateProps) {
  return (
    <Stack align="center" justify="center" mih={320} p="xl" className="rounded-3xl border border-dashed border-line bg-white text-center">
      <ThemeIcon size={56} radius="xl" color="emerald" variant="light"><PackageSearchIcon size={28} /></ThemeIcon>
      <Title order={3}>{title}</Title>
      <Text c="dimmed" maw={460}>{description}</Text>
      {actionLabel && actionHref && <Button component={Link} to={actionHref} color="emerald">{actionLabel}</Button>}
    </Stack>);

}