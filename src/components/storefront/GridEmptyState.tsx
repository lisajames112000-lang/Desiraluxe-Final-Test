import React from 'react';
import { Button, Text, ThemeIcon, Title } from '@mantine/core';
import { PackageSearchIcon } from 'lucide-react';
import { Link } from 'react-router-dom';

interface GridEmptyStateProps {
  title: string;
  description: string;
  variant?: 'products' | 'categories';
  placeholders?: number;
  actionLabel?: string;
  actionHref?: string;
}

const gridClasses = {
  products: 'grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-3 xl:grid-cols-4',
  categories: 'grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4 xl:grid-cols-8'
};

// Keeps the storefront grid structure visible when Firestore returns no
// published records. The outlines are empty frames only — no sample products
// or categories are substituted for real data.
export function GridEmptyState({ title, description, variant = 'products', placeholders = 4, actionLabel, actionHref }: GridEmptyStateProps) {
  return (
    <div className="relative">
      <div className={gridClasses[variant]} aria-hidden="true">
        {Array.from({ length: placeholders }, (_, index) =>
        <div key={index} className="overflow-hidden rounded-2xl border border-dashed border-line bg-white">
            <div className={`${variant === 'products' ? 'aspect-[4/5]' : 'aspect-square'} bg-sage`} />
            {variant === 'products' &&
          <div className="space-y-2 p-4">
                <div className="h-3 w-3/4 rounded-full bg-line" />
                <div className="h-3 w-1/3 rounded-full bg-sage" />
              </div>
          }
          </div>
        )}
      </div>
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div role="status" className="flex max-w-md flex-col items-center gap-3 rounded-3xl border border-line bg-white/95 px-6 py-8 text-center shadow-lift">
          <ThemeIcon size={52} radius="xl" color="emerald" variant="light"><PackageSearchIcon size={26} /></ThemeIcon>
          <Title order={3}>{title}</Title>
          <Text c="dimmed" size="sm">{description}</Text>
          {actionLabel && actionHref && <Button component={Link} to={actionHref} color="emerald">{actionLabel}</Button>}
        </div>
      </div>
    </div>);

}