export interface CartItem {
  productId: string;
  name: string;
  slug: string;
  image: string;
  sku: string;
  price: number;
  quantity: number;
  variantId?: string;
  variantLabel?: string;
  maxStock: number;
}