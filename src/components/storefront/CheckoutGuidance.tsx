import React from 'react';
import { Button, List, Text, ThemeIcon, Title } from '@mantine/core';
import { CheckIcon, LockKeyholeIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ImageWithFallback } from '../common/ImageWithFallback';

export function CheckoutGuidance() {
  return (
    <section className="grid overflow-hidden rounded-[1.75rem] border border-line bg-sage lg:grid-cols-2">
      <div className="flex flex-col justify-center p-8 sm:p-12 lg:p-16">
        <ThemeIcon color="emerald" variant="filled" radius="xl" size={50}><LockKeyholeIcon size={23} /></ThemeIcon>
        <Text mt="lg" size="xs" fw={700} tt="uppercase" lts="0.16em" c="emerald.6">Checkout, clearly explained</Text>
        <Title order={2} mt={6} className="!text-3xl sm:!text-4xl">Simple guest checkout. No account required.</Title>
        <Text c="dimmed" lh={1.7} mt="md">Checkout revalidates published products, prices, variants, and stock before recording an order. No account is required.</Text>
        <List mt="lg" spacing="sm" icon={<ThemeIcon color="emerald" size={22} radius="xl"><CheckIcon size={13} /></ThemeIcon>}>
          <List.Item>Current prices and stock checked by the server</List.Item>
          <List.Item>Manual payment remains pending until owner review</List.Item>
          <List.Item>Private order access uses a customer-specific token</List.Item>
        </List>
        <Button component={Link} to="/shipping" color="emerald" variant="light" mt="xl" className="self-start">Read shopping guidance</Button>
      </div>
      <ImageWithFallback src="/c4ba704f-bab4-46b6-bcfb-3410156e0ac3.jpg" alt="Stylised wallet, shield, and checkmark illustrating guided checkout" width={1024} height={768} loading="lazy" className="h-full min-h-[320px] w-full object-cover" containerClassName="h-full min-h-[320px]" />
    </section>);

}