import React from 'react';
import { Alert, Anchor, Text } from '@mantine/core';
import { InfoIcon } from 'lucide-react';

interface PreviewNoticeProps {
  compact?: boolean;
}

export function PreviewNotice({ compact = false }: PreviewNoticeProps) {
  return (
    <Alert
      icon={<InfoIcon size={17} />}
      color="yellow"
      radius={compact ? 0 : 'lg'}
      variant="light"
      styles={{ root: { border: '1px solid #E8D8A9' }, message: { width: '100%' } }}
      className={compact ? '!py-2' : ''}>
      
      <Text size={compact ? 'xs' : 'sm'} c="#5B4A20">
        <strong>Legacy Preview / live verification pending.</strong> Visible content may be preserved sample or stale cached data and must not be treated as current stock. Shared saving, checkout, and real payment acceptance remain disabled.{' '}
        <Anchor href="/about" c="#0B4938" fw={600}>Learn about preview limits</Anchor>
      </Text>
    </Alert>);

}