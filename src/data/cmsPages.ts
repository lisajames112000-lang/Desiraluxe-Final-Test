import type { CmsPage } from '../types/settings';

const updatedAt = '2026-10-01T00:00:00.000Z';

export const cmsPages: CmsPage[] = [
{ id: 'page_about', slug: 'about', title: 'About Desiraluxe', isSystem: true, updatedAt, content: 'Desiraluxe is a premium multi-category shopping concept built around thoughtful discovery. This preview catalog is created for design and interaction testing and does not represent verified commercial inventory.' },
{ id: 'page_shipping', slug: 'shipping', title: 'Shipping information', isSystem: true, updatedAt, content: 'Shipping costs and estimated delivery times must be configured by the store owner before production launch. The preview does not make delivery-time commitments.' },
{ id: 'page_returns', slug: 'returns', title: 'Returns & exchanges', isSystem: true, updatedAt, content: 'This is a draft policy for preview purposes. The store owner must define return windows, item-condition rules, and refund processes in line with applicable law before launch.' },
{ id: 'page_privacy', slug: 'privacy', title: 'Privacy notice', isSystem: true, updatedAt, content: 'This is a draft privacy notice. A production deployment must document its actual hosting, analytics, payment, storage, data-retention, and customer-rights practices.' },
{ id: 'page_terms', slug: 'terms', title: 'Terms & conditions', isSystem: true, updatedAt, content: 'These are draft terms for interface preview only. The store owner should obtain appropriate legal review before publishing commercial terms.' }];