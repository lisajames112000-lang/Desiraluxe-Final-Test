import React, { useState } from 'react';
import { Badge, Button, Card, Group, Stack, Text } from '@mantine/core';
import { CheckIcon, ListChecksIcon, ShoppingBagIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Product } from '../../types/catalog';
import { formatPKR, calcDiscountPercent } from '../../utils/money';
import { useStore } from '../../contexts/StoreContext';
import { ImageWithFallback } from '../common/ImageWithFallback';

export function ProductCard({ product }: {product: Product;}) {
  const { addToCart } = useStore();
  const [added, setAdded] = useState(false);
  const discount = calcDiscountPercent(product.price, product.compareAtPrice);
  const hasVariants = product.variants.length > 0;
  const available = hasVariants ? product.variants.some((variant) => variant.stock > 0) : product.stock > 0;
  const variantPrices = product.variants.filter((variant) => variant.stock > 0).map((variant) => variant.priceOverride ?? product.price);
  const displayPrice = variantPrices.length ? Math.min(...variantPrices) : product.price;
  const handleAdd = () => {
    const result = addToCart(product, 1);
    if (!result.ok) return;
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1400);
  };
  return <Card padding="sm" radius="xl" withBorder className="group h-full overflow-hidden !border-line !bg-white transition-[transform,box-shadow] duration-200 ease-out hover:-translate-y-1 hover:!shadow-lift"><Card.Section className="relative overflow-hidden bg-sage"><Link to={`/product/${product.slug}`} aria-label={`View ${product.name}`}><ImageWithFallback src={product.images[0]} alt={`${product.name}${product.isSample ? ' — sample product illustration' : ''}`} width={800} height={800} loading="lazy" className="aspect-square w-full object-cover transition-transform duration-300 ease-out group-hover:scale-[1.035]" containerClassName="aspect-square w-full" /></Link><Group gap={6} className="!absolute left-3 top-3">{product.isNewArrival && <Badge color="emerald" variant="filled" size="sm">New</Badge>}{discount && <Badge color="red" variant="filled" size="sm">-{discount}%</Badge>}</Group></Card.Section><Stack gap={6} mt="sm" className="flex-1"><Text size="xs" c="emerald.6" fw={600} tt="uppercase" lts="0.05em">{product.categorySlugs[0]?.replace(/-/g, ' ')}</Text><Text component={Link} to={`/product/${product.slug}`} fw={600} size="sm" c="#172A23" className="line-clamp-2 min-h-[2.5rem] no-underline hover:text-emerald-deep">{product.name}</Text><Group gap={8} align="baseline"><Text fw={700} c="#0B4938">{hasVariants ? 'From ' : ''}{formatPKR(displayPrice)}</Text>{product.compareAtPrice && <Text size="xs" c="dimmed" td="line-through">{formatPKR(product.compareAtPrice)}</Text>}</Group>{hasVariants ? <Button component={Link} to={`/product/${product.slug}`} mt="auto" color="emerald" size="sm" leftSection={<ListChecksIcon size={16} />} disabled={!available} fullWidth>{available ? 'Choose options' : 'Out of stock'}</Button> : <Button mt="auto" color="emerald" size="sm" leftSection={added ? <CheckIcon size={16} /> : <ShoppingBagIcon size={16} />} onClick={handleAdd} disabled={!available} fullWidth>{!available ? 'Out of stock' : added ? 'Added to cart' : 'Add to cart'}</Button>}</Stack></Card>;
}