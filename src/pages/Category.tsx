import React, { useMemo } from 'react';
import { Button, Container, Text, Title } from '@mantine/core';
import { Link, useParams } from 'react-router-dom';
import { useStore } from '../contexts/StoreContext';
import { useDocumentMeta } from '../hooks/useDocumentMeta';
import { BreadcrumbsNav } from '../components/common/BreadcrumbsNav';
import { EmptyState } from '../components/common/EmptyState';
import { LiveDataState } from '../components/common/LiveDataState';
import { ImageWithFallback } from '../components/common/ImageWithFallback';
import { ProductGrid } from '../components/storefront/ProductGrid';

export function Category() {
  const { slug = '' } = useParams();
  const { categories, products, resourceStatuses } = useStore();
  const category = categories.find((c) => c.slug === slug);
  const matches = useMemo(() => products.filter((p) => p.isPublished && p.categorySlugs.includes(slug)), [products, slug]);
  useDocumentMeta(category ? `${category.name} | Desiraluxe` : 'Category not found | Desiraluxe', category?.description || 'The requested Desiraluxe category could not be found.');
  if (!category) return <main className="py-20"><Container size="md"><LiveDataState status={resourceStatuses.categories} hasData={categories.length > 0} loadingLabel="Loading published categories…" emptyTitle="No published categories yet" emptyDescription="The catalog is connected, but no categories have been published."><EmptyState title="Category not found" description="This collection may have moved or is no longer published." actionLabel="View all categories" actionHref="/categories" /></LiveDataState></Container></main>;
  return (
    <main className="min-h-[70vh] py-8 sm:py-12">
      <Container size={1440} px={{ base: 16, sm: 24, lg: 32 }}>
        <BreadcrumbsNav items={[{ label: 'Home', href: '/' }, { label: 'Categories', href: '/categories' }, { label: category.name }]} />
        <section className="mb-10 grid overflow-hidden rounded-[1.75rem] border border-line bg-sage md:grid-cols-2">
          <div className="flex flex-col justify-center p-8 sm:p-12"><Text size="xs" tt="uppercase" fw={700} c="emerald.6" lts="0.16em">Desiraluxe collection</Text><Title order={1} mt={6} className="!text-4xl sm:!text-5xl">{category.name}</Title><Text c="dimmed" mt="md" lh={1.7}>{category.description}</Text><Text mt="lg" size="sm" fw={600}>{matches.length} published {matches.length === 1 ? 'product' : 'products'}</Text><Button component={Link} to={`/shop?category=${category.slug}`} color="emerald" mt="xl" className="self-start">Filter this collection</Button></div>
          <ImageWithFallback src={category.image} alt={`${category.name} collection`} width={1024} height={768} className="h-full min-h-[300px] w-full object-cover" containerClassName="h-full min-h-[300px]" />
        </section>
        <LiveDataState status={resourceStatuses.products} hasData={products.length > 0} loadingLabel="Loading published products…" emptyTitle="No published products yet" emptyDescription="The catalog is connected, but no products have been published.">
          {matches.length ? <ProductGrid products={matches} /> : <EmptyState title="No products in this category" description="Published products are available, but none belong to this collection." actionLabel="Browse all products" actionHref="/shop" />}
        </LiveDataState>
      </Container>
    </main>);

}