import React, { useEffect, useMemo, useState } from 'react';
import { Accordion, Badge, Button, Container, Group, Radio, Stack, Text, Title } from '@mantine/core';
import { CheckIcon, ShieldCheckIcon, ShoppingBagIcon, TruckIcon } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { useStore } from '../contexts/StoreContext';
import { useDocumentMeta } from '../hooks/useDocumentMeta';
import { formatPKR } from '../utils/money';
import { BreadcrumbsNav } from '../components/common/BreadcrumbsNav';
import { EmptyState } from '../components/common/EmptyState';
import { LiveDataState } from '../components/common/LiveDataState';
import { ImageWithFallback } from '../components/common/ImageWithFallback';
import { QuantityStepper } from '../components/common/QuantityStepper';
import { SectionHeading } from '../components/common/SectionHeading';
import { ProductGrid } from '../components/storefront/ProductGrid';

export function ProductDetail() {
  const { slug = '' } = useParams();
  const navigate = useNavigate();
  const { products, categories, resourceStatuses, addToCart } = useStore();
  const product = products.find((p) => p.slug === slug && p.isPublished);
  const [imageIndex, setImageIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [variantId, setVariantId] = useState(product?.variants.find((variant) => variant.stock > 0)?.id || '');
  const [added, setAdded] = useState(false);
  const category = categories.find((c) => c.slug === product?.categorySlugs[0]);
  const selectedVariant = product?.variants.find((v) => v.id === variantId);
  const related = useMemo(() => product ? products.filter((p) => p.id !== product.id && p.isPublished && p.categorySlugs.some((s) => product.categorySlugs.includes(s))).slice(0, 4) : [], [product, products]);
  useDocumentMeta(product?.seoTitle || 'Product not found | Desiraluxe', product?.seoDescription || 'The requested product could not be found.');
  useEffect(() => {
    setImageIndex(0);
    setQuantity(1);
    setVariantId(product?.variants.find((variant) => variant.stock > 0)?.id || '');
    setAdded(false);
  }, [product?.id, product?.variants]);
  const stock = selectedVariant?.stock ?? product?.stock ?? 0;
  useEffect(() => {setQuantity((current) => Math.max(1, Math.min(current, Math.max(1, stock))));setAdded(false);}, [stock, variantId]);
  if (!product) return <main className="py-20"><Container size="md"><LiveDataState status={resourceStatuses.products} hasData={products.length > 0} loadingLabel="Loading published products…" emptyTitle="No published products yet" emptyDescription="The catalog is connected, but no products have been published."><EmptyState title="Product not found" description="This product may have moved or been unpublished." actionLabel="Browse the shop" actionHref="/shop" /></LiveDataState></Container></main>;
  const galleryImages = Array.from(new Set(product.images.filter(Boolean)));
  const activeIndex = Math.min(imageIndex, Math.max(0, galleryImages.length - 1));
  const add = (buy = false) => {const result = addToCart(product, quantity, variantId || undefined);if (!result.ok) return;setAdded(true);if (buy) navigate('/checkout');};

  return (
    <main className="py-8 sm:py-12">
      <Container size={1440} px={{ base: 16, sm: 24, lg: 32 }}>
        <BreadcrumbsNav items={[{ label: 'Home', href: '/' }, { label: 'Shop', href: '/shop' }, ...(category ? [{ label: category.name, href: `/category/${category.slug}` }] : []), { label: product.name }]} />
        <div className="grid gap-8 lg:grid-cols-[1.05fr_.95fr] lg:gap-14">
          <section aria-label="Product gallery" className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start">
            {galleryImages.length > 1 && <div className="order-2 flex shrink-0 gap-2 overflow-x-auto sm:order-1 sm:w-[88px] sm:flex-col sm:overflow-x-visible">{galleryImages.map((img, i) => <button key={`${img}-${i}`} type="button" onClick={() => setImageIndex(i)} aria-label={`View image ${i + 1}`} aria-current={i === activeIndex} className={`block h-20 w-20 shrink-0 overflow-hidden rounded-xl border-2 bg-sage transition-colors ${i === activeIndex ? 'border-emerald-deep' : 'border-transparent hover:border-line'}`}><ImageWithFallback src={img} alt="" width={160} height={160} className="block h-full w-full object-cover" containerClassName="h-full w-full" /></button>)}</div>}
            <div className="order-1 min-w-0 flex-1 space-y-4 sm:order-2"><div className="relative aspect-square w-full overflow-hidden rounded-3xl border border-line bg-sage"><ImageWithFallback src={galleryImages[activeIndex]} alt={`${product.name}, view ${activeIndex + 1}`} width={900} height={900} className="absolute inset-0 block h-full w-full object-cover" containerClassName="absolute inset-0 h-full w-full" /></div>{product.videoUrl && <div><Text size="sm" fw={700} mb="xs">Product video</Text><video src={product.videoUrl} poster={product.images[0]} controls preload="metadata" playsInline className="max-h-[640px] w-full rounded-3xl border border-line bg-black object-contain" aria-label={`${product.name} product video`} /></div>}</div>
          </section>
          <section>
            <Group gap={8}>{product.isNewArrival && <Badge color="emerald">New arrival</Badge>}{product.isSample && <Badge color="yellow" variant="light">Sample product</Badge>}</Group>
            <Text size="xs" tt="uppercase" fw={700} c="emerald.6" lts="0.13em" mt="lg">{category?.name}</Text>
            <Title order={1} mt={6} className="!text-4xl sm:!text-5xl">{product.name}</Title>
            <Group mt="md" align="baseline"><Text fw={700} size="xl" c="emerald.8">{formatPKR(selectedVariant?.priceOverride ?? product.price)}</Text>{product.compareAtPrice && <Text c="dimmed" td="line-through">{formatPKR(product.compareAtPrice)}</Text>}</Group>
            <Text c="dimmed" lh={1.75} mt="lg">{product.description}</Text>
            {product.isSample && <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"><strong>Illustrative sample only.</strong> The owner must replace imagery and verify pricing, stock, variants, and product details before sale.</div>}
            {product.variants.length > 0 && <Radio.Group mt="xl" label={product.variantOptions[0]?.name || 'Variant'} value={variantId} onChange={setVariantId}><Group mt="xs">{product.variants.map((v) => <Radio.Card key={v.id} value={v.id} disabled={v.stock <= 0} radius="md" p="sm" withBorder className="min-w-20"><Group gap="xs"><Radio.Indicator /><Text size="sm" fw={600}>{v.label}{v.stock <= 0 ? ' · unavailable' : ''}</Text></Group></Radio.Card>)}</Group></Radio.Group>}
            <Group mt="xl"><QuantityStepper value={quantity} max={Math.max(1, stock)} onChange={setQuantity} /><Text size="sm" c={stock > 0 ? 'emerald.7' : 'red'} fw={600}>{stock > 0 ? `${stock} unit${stock === 1 ? '' : 's'} in stock` : 'Out of stock'}</Text></Group>
            <div className="mt-6 grid gap-3 sm:grid-cols-2"><Button size="lg" color="emerald" leftSection={added ? <CheckIcon size={18} /> : <ShoppingBagIcon size={18} />} onClick={() => add(false)} disabled={stock <= 0}>{added ? 'Added to cart' : 'Add to cart'}</Button><Button size="lg" color="emerald" variant="outline" onClick={() => add(true)} disabled={stock <= 0}>Buy now</Button></div>
            <Stack gap="xs" mt="xl"><Group gap="sm"><TruckIcon size={20} className="text-emerald-deep" /><Text size="sm">Shipping fees and availability are confirmed at checkout.</Text></Group><Group gap="sm"><ShieldCheckIcon size={20} className="text-emerald-deep" /><Text size="sm">Price and stock are revalidated before an order is recorded.</Text></Group></Stack>
            <Accordion mt="xl" variant="separated" radius="md" defaultValue="specs"><Accordion.Item value="specs"><Accordion.Control>Specifications</Accordion.Control><Accordion.Panel><dl className="divide-y divide-line">{product.specifications.map((s) => <div key={s.label} className="grid grid-cols-2 gap-4 py-2 text-sm"><dt className="font-semibold">{s.label}</dt><dd>{s.value}</dd></div>)}</dl></Accordion.Panel></Accordion.Item><Accordion.Item value="shipping"><Accordion.Control>Shipping & returns</Accordion.Control><Accordion.Panel><Text size="sm" c="dimmed">This preview intentionally makes no delivery or returns guarantee. The owner must configure actual policies in Admin before launch.</Text></Accordion.Panel></Accordion.Item></Accordion>
          </section>
        </div>
        <section className="mt-20"><SectionHeading title="You may also like" actionLabel="View collection" actionHref={category ? `/category/${category.slug}` : '/shop'} /><ProductGrid products={related} /></section>
      </Container>
    </main>);

}