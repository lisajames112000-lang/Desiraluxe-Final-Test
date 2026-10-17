import React, { useEffect, useMemo, useState } from 'react';
import { Button, Container, Drawer, Group, Pagination, Text, Title } from '@mantine/core';
import { SlidersHorizontalIcon } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { useStore } from '../contexts/StoreContext';
import { useDocumentMeta } from '../hooks/useDocumentMeta';
import { BreadcrumbsNav } from '../components/common/BreadcrumbsNav';
import { EmptyState } from '../components/common/EmptyState';
import { LiveDataState } from '../components/common/LiveDataState';
import { ProductGrid } from '../components/storefront/ProductGrid';
import { GridEmptyState } from '../components/storefront/GridEmptyState';
import { ShopFilters, type ShopFilterState } from '../components/storefront/ShopFilters';

const PAGE_SIZE = 24;
const defaults: ShopFilterState = { query: '', category: '', minPrice: '', maxPrice: '', inStock: false, hasVariants: false, sort: 'featured' };

export function Shop() {
  const { products, categories, resourceStatuses } = useStore();
  const [params] = useSearchParams();
  const [filters, setFilters] = useState<ShopFilterState>(() => ({ ...defaults, query: params.get('q') || '', category: params.get('category') || '', sort: params.get('sort') || 'featured' }));
  const [page, setPage] = useState(1);
  const [drawer, setDrawer] = useState(false);
  useDocumentMeta('Shop all products | Desiraluxe', 'Browse and filter the published Desiraluxe catalog.');
  useEffect(() => {setPage(1);}, [filters]);
  useEffect(() => {
    const q = params.get('q') || '';
    const sort = params.get('sort') || 'featured';
    const category = params.get('category') || '';
    setFilters((f) => ({ ...f, query: q, sort, category }));
  }, [params]);

  const filtered = useMemo(() => {
    const q = filters.query.trim().toLowerCase();
    const list = products.filter((p) => p.isPublished && (!q || [p.name, p.description, p.sku, ...p.categorySlugs].join(' ').toLowerCase().includes(q)) && (!filters.category || p.categorySlugs.includes(filters.category)) && (filters.minPrice === '' || p.price >= filters.minPrice) && (filters.maxPrice === '' || p.price <= filters.maxPrice) && (!filters.inStock || p.stock > 0) && (!filters.hasVariants || p.variants.length > 0));
    return [...list].sort((a, b) => filters.sort === 'price-low' ? a.price - b.price : filters.sort === 'price-high' ? b.price - a.price : filters.sort === 'newest' ? b.createdAt.localeCompare(a.createdAt) : filters.sort === 'name' ? a.name.localeCompare(b.name) : Number(b.isFeatured) - Number(a.isFeatured));
  }, [filters, products]);
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const shown = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <main className="min-h-[70vh] py-8 sm:py-12">
      <Container size={1440} px={{ base: 16, sm: 24, lg: 32 }}>
        <BreadcrumbsNav items={[{ label: 'Home', href: '/' }, { label: 'Shop' }]} />
        <div className="mb-8"><Title order={1} className="!text-4xl sm:!text-5xl">Shop the collection</Title><Text c="dimmed" mt="sm">Published products in one curated, filterable catalog.</Text></div>
        <Group justify="space-between" mb="lg"><Text size="sm" fw={600}>{filtered.length} {filtered.length === 1 ? 'result' : 'results'}</Text><Button variant="light" color="emerald" leftSection={<SlidersHorizontalIcon size={16} />} onClick={() => setDrawer(true)} className="lg:hidden">Filters</Button></Group>
        <div className="grid gap-8 lg:grid-cols-[260px_minmax(0,1fr)]">
          <aside className="hidden rounded-2xl border border-line bg-white p-5 lg:block"><ShopFilters categories={categories} value={filters} onChange={setFilters} onClear={() => setFilters(defaults)} /></aside>
          <LiveDataState status={resourceStatuses.products} hasData={products.length > 0} loadingLabel="Loading published products…" emptyTitle="No published products yet" emptyDescription="The catalog is connected, but no products have been published." emptyFallback={<GridEmptyState placeholders={8} title="No published products yet" description="The store is connected to the live catalog, but no products have been published. New products appear here as soon as the owner publishes them." />}><div>{shown.length ? <ProductGrid products={shown} /> : <EmptyState title="No products found" description="Try a different keyword, category, price range, or clear the current filters." actionLabel="Browse all products" actionHref="/shop" />}{pageCount > 1 && <Group justify="center" mt="xl"><Pagination total={pageCount} value={page} onChange={setPage} color="emerald" /></Group>}</div></LiveDataState>
        </div>
      </Container>
      <Drawer opened={drawer} onClose={() => setDrawer(false)} title="Filter products" position="bottom" size="85%"><ShopFilters categories={categories} value={filters} onChange={setFilters} onClear={() => setFilters(defaults)} /><Button fullWidth color="emerald" mt="xl" onClick={() => setDrawer(false)}>Show {filtered.length} results</Button></Drawer>
    </main>);

}