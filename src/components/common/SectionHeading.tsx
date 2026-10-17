import React from 'react';
import { Button, Group, Stack, Text, Title } from '@mantine/core';
import { ArrowRightIcon } from 'lucide-react';
import { Link } from 'react-router-dom';

interface SectionHeadingProps {
  eyebrow?: string;
  title: string;
  description?: string;
  actionLabel?: string;
  actionHref?: string;
  align?: 'left' | 'center';
}

export function SectionHeading({ eyebrow, title, description, actionLabel, actionHref, align = 'left' }: SectionHeadingProps) {
  return (
    <Group justify="space-between" align="end" gap="lg" mb="xl">
      <Stack gap={6} maw={650} align={align === 'center' ? 'center' : 'stretch'} className={align === 'center' ? 'mx-auto text-center' : ''}>
        {eyebrow && <Text size="xs" fw={700} tt="uppercase" c="emerald.6" lts="0.16em">{eyebrow}</Text>}
        <Title order={2} c="#172A23" className="!text-3xl sm:!text-4xl">{title}</Title>
        {description && <Text c="dimmed" size="sm" lh={1.7}>{description}</Text>}
      </Stack>
      {actionLabel && actionHref &&
      <Button component={Link} to={actionHref} variant="subtle" color="emerald" rightSection={<ArrowRightIcon size={16} />} className="hidden sm:inline-flex">
          {actionLabel}
        </Button>
      }
    </Group>);

}