import type { AccountingPeriod, BrandSettings } from '../types/settings';

export const brandSettings: BrandSettings = {
  logoText: 'DESIRALUXE',
  logoTagline: 'INDULGE IN DESIRE',
  logoUrl: "/Desiraluxe-png-2.png",
  logoAlt: 'Desiraluxe — Indulge in Desire',
  logoDesktopHeight: 76,
  logoMobileHeight: 52,
  logoFooterHeight: 64,
  announcementText: 'Free delivery on preview orders above PKR 10,000  ·  Luxury for every moment',
  announcementEnabled: true,
  contactEmail: 'hello@desiraluxe.com',
  contactPhone: '+92 300 000 0000',
  contactWhatsapp: '+92 300 000 0000',
  contactAddress: 'Pakistan · Online store preview',
  socialLinks: [
  { platform: 'Instagram', url: '#' },
  { platform: 'Facebook', url: '#' },
  { platform: 'Pinterest', url: '#' }],

  currency: 'PKR',
  reviewCountdownMinutes: 30,
  shippingFee: 500,
  freeShippingThreshold: 10000,
  timezone: 'Asia/Karachi',
  homepageSectionOrder: ['hero', 'categories', 'featured', 'showcase', 'new-arrivals', 'category-spotlight', 'guidance', 'highlights'],
  homepageSectionsEnabled: { hero: true, categories: true, featured: true, showcase: true, 'new-arrivals': true, 'category-spotlight': true, guidance: true, highlights: true }
};

export const initialAccountingPeriods: AccountingPeriod[] = [
{ id: 'period_initial', startedAt: '2026-10-01T00:00:00.000Z', label: 'Current period' }];