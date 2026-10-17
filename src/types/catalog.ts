// Catalog domain types: categories and products.

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
  image: string;
  parentSlug?: string;
  displayOrder: number;
  isFeatured: boolean;
  isSample: boolean;
  isPublished: boolean;
  updatedAt?: string;
}

export interface ProductVariantOption {
  name: string;
  values: string[];
}

export interface ProductVariant {
  id: string;
  label: string;
  optionValues: Record<string, string>;
  sku: string;
  stock: number;
  priceOverride?: number;
}

export interface ProductSpec {
  label: string;
  value: string;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  sku: string;
  categorySlugs: string[];
  description: string;
  price: number;
  compareAtPrice?: number;
  costPrice?: number;
  currency: 'PKR';
  stock: number;
  variantOptions: ProductVariantOption[];
  variants: ProductVariant[];
  specifications: ProductSpec[];
  images: string[];
  videoUrl?: string;
  seoTitle: string;
  seoDescription: string;
  isFeatured: boolean;
  isNewArrival: boolean;
  isSample: boolean;
  isPublished: boolean;
  isVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

export type ProductMutation = Omit<Product, 'costPrice'> & {costPrice?: number | null;};