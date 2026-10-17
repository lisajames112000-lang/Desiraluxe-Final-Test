import { describe, expect, it } from 'vitest';
import { brandSettings } from '../../data/brandSettings';
import { paymentMethods } from '../../data/paymentMethods';
import { categorySchema, cmsPageSchema, heroSlideSchema, paymentMethodSchema, popupSchema } from './adminContentSchemas';

const category = {
  id: 'cat_test',
  name: 'Test category',
  slug: 'test-category',
  description: 'Test',
  image: 'https://example.com/category.jpg',
  displayOrder: 1,
  isFeatured: false,
  isSample: false,
  isPublished: true
};

describe('admin content schemas', () => {
  it('accepts the preserved category shape', () => {
    expect(categorySchema.parse(category)).toEqual(category);
  });

  it('requires media before publishing a category', () => {
    expect(categorySchema.safeParse({ ...category, image: '' }).success).toBe(false);
  });

  it('accepts preserved same-site media and explicit optional-media clearing', () => {
    expect(categorySchema.safeParse({ ...category, image: '/media/category.webp' }).success).toBe(true);
    const popup = { id: 'popup_clear', title: 'Test', message: 'Message', image: '', isEnabled: false, routes: ['/'], frequency: 'session' };
    expect(popupSchema.parse(popup).image).toBeUndefined();
    expect(paymentMethodSchema.parse({ ...paymentMethods[0], qrImage: '' }).qrImage).toBeUndefined();
  });

  it('rejects traversal and unsafe media schemes', () => {
    expect(categorySchema.safeParse({ ...category, image: '/../private' }).success).toBe(false);
    expect(categorySchema.safeParse({ ...category, image: 'javascript:alert(1)' }).success).toBe(false);
  });

  it('rejects inverted hero and popup schedules', () => {
    const schedule = { startAt: '2026-10-12T12:00:00.000Z', endAt: '2026-10-12T11:00:00.000Z' };
    const hero = { id: 'hero_test', order: 1, eyebrow: '', headline: 'Test', subheadline: '', ctaLabel: 'Shop', ctaHref: '/shop', image: 'https://example.com/hero.jpg', theme: 'light', isVisible: true, ...schedule };
    const popup = { id: 'popup_test', title: 'Test', message: 'Message', isEnabled: true, routes: ['/'], frequency: 'session', ...schedule };
    expect(heroSlideSchema.safeParse(hero).success).toBe(false);
    expect(popupSchema.safeParse(popup).success).toBe(false);
  });

  it('requires complete manual payment details before enabling', () => {
    expect(paymentMethodSchema.safeParse({ ...paymentMethods[0], enabled: true }).success).toBe(false);
    expect(paymentMethodSchema.safeParse({ ...paymentMethods[0], enabled: true, accountTitle: 'Owner', accountNumber: '03000000000', instructions: 'Send payment and wait for manual review.' }).success).toBe(true);
  });

  it('accepts a new CMS page before the server assigns its revision', () => {
    const page = { id: 'page_test', slug: 'test-page', title: 'Test page', content: 'Content', isSystem: false, isPublished: false };
    expect(cmsPageSchema.parse(page)).toEqual(page);
    expect(cmsPageSchema.safeParse({ ...page, updatedAt: 'not-a-date' }).success).toBe(false);
  });

  it('accepts the preserved public site settings contract', async () => {
    const { brandSettingsSchema } = await import('./adminContentSchemas');
    expect(brandSettingsSchema.safeParse(brandSettings).success).toBe(true);
  });
});