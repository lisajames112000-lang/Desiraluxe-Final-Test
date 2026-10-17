import React from 'react';
import type { Product } from '../../types/catalog';
import { ProductCard } from './ProductCard';

export function ProductGrid({ products }: {products: Product[];}) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-3 xl:grid-cols-4">
      {products.map((p) => <ProductCard product={p} key={p.id} />)}
    </div>);

}