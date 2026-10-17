// Site configuration, hero banners, payment method config, popups, CMS pages.
import type { PaymentMethodType } from './order';

export interface HeroSlide {
  id: string;
  order: number;
  eyebrow: string;
  headline: string;
  subheadline: string;
  ctaLabel: string;
  ctaHref: string;
  image: string;
  mobileImage?: string;
  mediaFit?: 'cover' | 'contain';
  focalPoint?: string;
  overlayStrength?: number;
  textAlign?: 'left' | 'center' | 'right';
  theme: 'light' | 'dark';
  isVisible: boolean;
  startAt?: string;
  endAt?: string;
  updatedAt?: string;
}

export interface PaymentMethodConfig {
  id: string;
  type: PaymentMethodType;
  label: string;
  enabled: boolean;
  accountTitle: string;
  accountNumber: string;
  instructions: string;
  country: string;
  currency: string;
  qrImage?: string;
  cryptoAsset?: string;
  cryptoNetwork?: string;
  updatedAt?: string;
}

export interface PromoPopup {
  id: string;
  title: string;
  message: string;
  image?: string;
  ctaLabel?: string;
  ctaHref?: string;
  isEnabled: boolean;
  startAt?: string;
  endAt?: string;
  routes: string[];
  frequency: 'session' | 'day' | 'once';
  delayMs?: number;
  priority?: number;
  campaignVersion?: number;
  updatedAt?: string;
}

export interface CmsPage {
  id: string;
  slug: string;
  title: string;
  content: string;
  updatedAt?: string;
  isSystem: boolean;
  isPublished?: boolean;
}

export interface SocialLink {
  platform: string;
  url: string;
}

export interface BrandSettings {
  logoText: string;
  logoTagline: string;
  logoUrl?: string;
  logoAlt?: string;
  logoDesktopHeight?: number;
  logoMobileHeight?: number;
  logoFooterHeight?: number;
  announcementText: string;
  announcementEnabled: boolean;
  contactEmail: string;
  contactPhone: string;
  contactWhatsapp: string;
  contactAddress: string;
  socialLinks: SocialLink[];
  currency: 'PKR';
  reviewCountdownMinutes: number;
  shippingFee?: number;
  freeShippingThreshold?: number;
  timezone?: string;
  homepageSectionOrder: string[];
  homepageSectionsEnabled?: Record<string, boolean>;
  updatedAt?: string;
}

export interface AdminSession {
  active: boolean;
  startedAt: string;
  expiresAt: string;
  email: string;
}

export interface AccountingPeriod {
  id: string;
  startedAt: string;
  endedAt?: string;
  label: string;
}