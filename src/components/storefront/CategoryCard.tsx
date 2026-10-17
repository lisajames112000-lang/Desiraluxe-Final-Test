import React from 'react';
import { Text } from '@mantine/core';
import { ArrowUpRightIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Category } from '../../types/catalog';
import { ImageWithFallback } from '../common/ImageWithFallback';

interface CategoryCardProps {
  category: Category;
  size?: 'sm' | 'lg';
}

export function CategoryCard({ category, size = 'sm' }: CategoryCardProps) {
  return (
    <Link to={`/category/${category.slug}`} className="group block overflow-hidden rounded-2xl border border-line bg-white no-underline transition-[transform,box-shadow] duration-200 ease-out hover:-translate-y-1 hover:shadow-soft">
      <div className="overflow-hidden">
        <ImageWithFallback src={category.image} alt={`${category.name} category`} width={1024} height={768} loading="lazy" className={`${size === 'lg' ? 'aspect-[4/3]' : 'aspect-[5/4]'} w-full object-cover transition-transform duration-300 ease-out group-hover:scale-[1.035]`} containerClassName={size === 'lg' ? 'aspect-[4/3]' : 'aspect-[5/4]'} />
      </div>
      <div className="flex items-center justify-between gap-3 p-4">
        <div>
          <Text fw={700} c="#172A23">{category.name}</Text>
          {size === 'lg' && <Text size="xs" c="dimmed" mt={3} className="line-clamp-2">{category.description}</Text>}
        </div>
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sage text-emerald-deep transition-colors duration-200 group-hover:bg-emerald-deep group-hover:text-white"><ArrowUpRightIcon size={15} /></span>
      </div>
    </Link>);

}