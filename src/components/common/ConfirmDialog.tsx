import React from 'react';
import { Button, Group, Modal, Stack, Text, TextInput } from '@mantine/core';
import { AlertTriangleIcon } from 'lucide-react';

interface ConfirmDialogProps {
  opened: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  confirmText?: string;
  typedValue?: string;
  onTypedValueChange?: (value: string) => void;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  danger?: boolean;
  children?: React.ReactNode;
}

export function ConfirmDialog({ opened, title, message, confirmLabel = 'Confirm', confirmText, typedValue = '', onTypedValueChange, onClose, onConfirm, danger = false, children }: ConfirmDialogProps) {
  const [submitting, setSubmitting] = React.useState(false);
  const disabled = submitting || !!confirmText && typedValue !== confirmText;
  const confirm = async () => {
    if (disabled) return;
    setSubmitting(true);
    try {
      await onConfirm();
    } finally {
      setSubmitting(false);
    }
  };
  return (
    <Modal opened={opened} onClose={submitting ? () => undefined : onClose} title={title} centered radius="lg" overlayProps={{ backgroundOpacity: 0.45, blur: 2 }} closeOnClickOutside={!submitting} closeOnEscape={!submitting}>
      <Stack>
        <div className={`flex gap-3 rounded-xl p-4 ${danger ? 'bg-red-50 text-red-900' : 'bg-amber-50 text-amber-900'}`}>
          <AlertTriangleIcon size={22} className="mt-0.5 shrink-0" />
          <Text size="sm" lh={1.6}>{message}</Text>
        </div>
        {confirmText &&
        <TextInput label={`Type “${confirmText}” to continue`} value={typedValue} onChange={(e) => onTypedValueChange?.(e.currentTarget.value)} />
        }
        {children}
        <Group justify="end">
          <Button variant="default" onClick={onClose} disabled={submitting}>Cancel</Button>
          <Button color={danger ? 'red' : 'emerald'} onClick={() => void confirm()} disabled={disabled} loading={submitting}>{confirmLabel}</Button>
        </Group>
      </Stack>
    </Modal>);

}