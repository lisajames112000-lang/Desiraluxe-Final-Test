import React from 'react';
import { Button, Checkbox, Divider, NumberInput, Select, Stack, Text, TextInput } from '@mantine/core';
import { SearchIcon, XIcon } from 'lucide-react';
import type { Category } from '../../types/catalog';

export interface ShopFilterState {
  query: string;
  category: string;
  minPrice: number | '';
  maxPrice: number | '';
  inStock: boolean;
  hasVariants: boolean;
  sort: string;
}

interface ShopFiltersProps {
  categories: Category[];
  value: ShopFilterState;
  onChange: (next: ShopFilterState) => void;
  onClear: () => void;
}

export function ShopFilters({ categories, value, onChange, onClear }: ShopFiltersProps) {
  return (
    <Stack gap="md">
      <div>
        <Text fw={700} size="sm" mb={8}>Search</Text>
        <TextInput aria-label="Search products" placeholder="Name, SKU, or description" value={value.query} onChange={(e) => onChange({ ...value, query: e.currentTarget.value })} leftSection={<SearchIcon size={16} />} />
      </div>
      <Select label="Category" placeholder="All categories" clearable searchable value={value.category || null} data={categories.filter((c) => c.isPublished).map((c) => ({ value: c.slug, label: c.name }))} onChange={(category) => onChange({ ...value, category: category || '' })} />
      <Divider />
      <Text fw={700} size="sm">Price (PKR)</Text>
      <div className="grid grid-cols-2 gap-2">
        <NumberInput label="Minimum" min={0} value={value.minPrice} onChange={(minPrice) => onChange({ ...value, minPrice: typeof minPrice === 'number' ? minPrice : '' })} thousandSeparator="," />
        <NumberInput label="Maximum" min={0} value={value.maxPrice} onChange={(maxPrice) => onChange({ ...value, maxPrice: typeof maxPrice === 'number' ? maxPrice : '' })} thousandSeparator="," />
      </div>
      <Divider />
      <Checkbox label="In stock only" color="emerald" checked={value.inStock} onChange={(e) => onChange({ ...value, inStock: e.currentTarget.checked })} />
      <Checkbox label="Has selectable variants" color="emerald" checked={value.hasVariants} onChange={(e) => onChange({ ...value, hasVariants: e.currentTarget.checked })} />
      <Divider />
      <Select label="Sort by" value={value.sort} onChange={(sort) => onChange({ ...value, sort: sort || 'featured' })} data={[{ value: 'featured', label: 'Featured' }, { value: 'newest', label: 'Newest' }, { value: 'price-low', label: 'Price: low to high' }, { value: 'price-high', label: 'Price: high to low' }, { value: 'name', label: 'Name A–Z' }]} />
      <Button variant="subtle" color="gray" leftSection={<XIcon size={15} />} onClick={onClear}>Clear filters</Button>
    </Stack>);

}