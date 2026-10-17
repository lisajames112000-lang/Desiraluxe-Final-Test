import React from 'react';
import { Container, Text, Title } from '@mantine/core';
import { useStore } from '../contexts/StoreContext';
import { useDocumentMeta } from '../hooks/useDocumentMeta';
import { BreadcrumbsNav } from '../components/common/BreadcrumbsNav';
import { LiveDataState } from '../components/common/LiveDataState';
import { CategoryCard } from '../components/storefront/CategoryCard';

export function Categories() {
  const { categories, products, resourceStatuses } = useStore();
  useDocumentMeta('Shop all categories | Desiraluxe', 'Browse published Desiraluxe shopping categories.');
  return (
    <main className="min-h-[70vh] py-8 sm:py-12">
      <Container size={1440} px={{ base: 16, sm: 24, lg: 32 }}>
        <BreadcrumbsNav items={[{ label: 'Home', href: '/' }, { label: 'Categories' }]} />
        <div className="mb-10 max-w-2xl"><Text size="xs" tt="uppercase" fw={700} c="emerald.6" lts="0.16em">Curated collections</Text><Title order={1} mt={6} className="!text-4xl sm:!text-5xl">Discover Desiraluxe</Title><Text c="dimmed" mt="md" lh={1.7}>From a considered wardrobe to a calmer home, each published collection is designed to be clear, useful, and easy to shop.</Text></div>
        <LiveDataState status={resourceStatuses.categories} hasData={categories.length > 0} loadingLabel="Loading published categories…" emptyTitle="No published categories yet" emptyDescription="The catalog is connected, but no categories have been published.">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-6 lg:grid-cols-4 xl:grid-cols-5">
            {categories.filter((c) => c.isPublished).sort((a, b) => a.displayOrder - b.displayOrder).map((c) =>
            <div key={c.id} className="relative"><CategoryCard category={c} size="lg" /><span className="absolute left-4 top-4 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-emerald-deep shadow-sm">{products.filter((p) => p.categorySlugs.includes(c.slug) && p.isPublished).length} items</span></div>
            )}
          </div>
        </LiveDataState>
      </Container>
    </main>);

}