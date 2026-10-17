import React from 'react';
import { ActionIcon, Group, Text } from '@mantine/core';
import { MinusIcon, PlusIcon } from 'lucide-react';

interface QuantityStepperProps {
  value: number;
  min?: number;
  max?: number;
  onChange: (value: number) => void;
  size?: 'sm' | 'md';
}

export function QuantityStepper({ value, min = 1, max = 99, onChange, size = 'md' }: QuantityStepperProps) {
  const actionSize = size === 'sm' ? 30 : 36;
  return (
    <Group gap={4} wrap="nowrap" role="group" aria-label="Quantity">
      <ActionIcon variant="subtle" color="emerald" size={actionSize} aria-label="Decrease quantity" disabled={value <= min} onClick={() => onChange(Math.max(min, value - 1))}>
        <MinusIcon size={15} />
      </ActionIcon>
      <Text component="output" aria-live="polite" w={28} ta="center" fw={600} size={size}>{value}</Text>
      <ActionIcon variant="subtle" color="emerald" size={actionSize} aria-label="Increase quantity" disabled={value >= max} onClick={() => onChange(Math.min(max, value + 1))}>
        <PlusIcon size={15} />
      </ActionIcon>
    </Group>);

}