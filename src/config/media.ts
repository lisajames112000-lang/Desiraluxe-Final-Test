export type MediaRole = 'product' | 'category' | 'heroDesktop' | 'heroMobile' | 'popup' | 'logo' | 'favicon' | 'paymentQr' | 'video';

export interface MediaRequirement {
  label: string;
  accept: string[];
  maxBytes: number;
  recommended: string;
  ratio: string;
  fit: 'cover' | 'contain';
  advisory: string;
}

export const mediaRequirements: Record<MediaRole, MediaRequirement> = {
  product: { label: 'Product image', accept: ['image/jpeg', 'image/png', 'image/webp', 'image/avif'], maxBytes: 5_000_000, recommended: '1600 × 1600 px', ratio: '1:1', fit: 'cover', advisory: 'Dimensions are advisory; file size is enforced.' },
  category: { label: 'Category image', accept: ['image/jpeg', 'image/png', 'image/webp', 'image/avif'], maxBytes: 3_000_000, recommended: '1000 × 1000 px', ratio: '1:1', fit: 'cover', advisory: 'Dimensions are advisory; file size is enforced.' },
  heroDesktop: { label: 'Desktop hero', accept: ['image/jpeg', 'image/png', 'image/webp', 'image/avif'], maxBytes: 5_000_000, recommended: '1920 × 800 px', ratio: '2.4:1', fit: 'cover', advisory: 'Use focal-point controls to protect important subjects.' },
  heroMobile: { label: 'Mobile hero', accept: ['image/jpeg', 'image/png', 'image/webp', 'image/avif'], maxBytes: 3_000_000, recommended: '900 × 1200 px', ratio: '3:4', fit: 'cover', advisory: 'Separate mobile artwork is optional.' },
  popup: { label: 'Popup image', accept: ['image/jpeg', 'image/png', 'image/webp', 'image/avif'], maxBytes: 3_000_000, recommended: '1000 × 1200 px', ratio: '5:6', fit: 'cover', advisory: 'The popup remains usable without an image.' },
  logo: { label: 'Logo', accept: ['image/png', 'image/webp'], maxBytes: 1_000_000, recommended: '1200 × 400 px', ratio: 'preserve intrinsic', fit: 'contain', advisory: 'Transparent PNG or WebP is recommended.' },
  favicon: { label: 'Favicon source', accept: ['image/png', 'image/webp'], maxBytes: 1_000_000, recommended: '512 × 512 px', ratio: '1:1', fit: 'contain', advisory: 'Square artwork is required for best results.' },
  paymentQr: { label: 'Payment QR', accept: ['image/jpeg', 'image/png', 'image/webp'], maxBytes: 2_000_000, recommended: '1000 × 1000 px', ratio: '1:1', fit: 'contain', advisory: 'Keep the code sharp and unobstructed.' },
  video: { label: 'Hero or product video', accept: ['video/mp4', 'video/webm'], maxBytes: 30_000_000, recommended: '1920 × 1080 or 720 × 1280 px', ratio: 'layout-dependent', fit: 'cover', advisory: 'A poster is required. Stored on Cloudinary as uploaded.' }
};