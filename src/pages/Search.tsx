import React, { useEffect, useMemo, useState } from 'react';
import { Button, Container, Text, TextInput, Title } from '@mantine/core';
import { SearchIcon } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useStore } from '../contexts/StoreContext';
import { useDocumentMeta } from '../hooks/useDocumentMeta';
import { EmptyState } from '../components/common/EmptyState';
import { LiveDataState } from '../components/common/LiveDataState';
import { ProductGrid } from '../components/storefront/ProductGrid';

export function Search() {
  const { products, resourceStatuses } = useStore();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const query = params.get('q') || '';
  const [value, setValue] = useState(query);
  useEffect(() => setValue(query), [query]);
  useDocumentMeta(query ? `Search: ${query} | Desiraluxe` : 'Search | Desiraluxe', 'Search the Desiraluxe catalog.', true);
  const results = useMemo(() => {const q = query.trim().toLowerCase();return q ? products.filter((p) => p.isPublished && [p.name, p.description, p.sku, ...p.categorySlugs].join(' ').toLowerCase().includes(q)) : [];}, [products, query]);
  const submit = (e: React.FormEvent) => {e.preventDefault();navigate(`/search?q=${encodeURIComponent(value.trim())}`);};
  return <main className="min-h-[70vh] py-12"><Container size={1200}><Title order={1} className="!text-4xl sm:!text-5xl">Search Desiraluxe</Title><form onSubmit={submit} className="mt-6 flex gap-2"><TextInput label="Search products" value={value} onChange={(e) => setValue(e.currentTarget.value)} placeholder="Product name, description, or SKU" leftSection={<SearchIcon size={17} />} size="lg" className="flex-1" autoFocus /><Button type="submit" size="lg" color="emerald">Search</Button></form>{query && resourceStatuses.products.state !== 'loading' && <Text mt="xl" mb="lg" fw={600}>{results.length} results for “{query}”</Text>}<LiveDataState status={resourceStatuses.products} hasData={products.length > 0} loadingLabel="Loading published products…" emptyTitle="No published products yet" emptyDescription="The catalog is connected, but no products have been published.">{results.length ? <ProductGrid products={results} /> : <div className="mt-10"><EmptyState title={query ? 'No matching products' : 'What are you looking for?'} description={query ? 'Try a broader keyword or browse every collection.' : 'Search by product name, description, category, or SKU.'} actionLabel="Browse all products" actionHref="/shop" /></div>}</LiveDataState></Container></main>;
}