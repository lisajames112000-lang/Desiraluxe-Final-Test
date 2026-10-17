import { z } from 'zod';
import { optionalMediaUrlSchema, safeMediaUrlSchema } from '../../utils/mediaUrl.js';

const safeString = (maximum: number) => z.string().trim().max(maximum);
const id = safeString(120).min(1).regex(/^[A-Za-z0-9_-]+$/);
const slug = safeString(180).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const optionalUrl = optionalMediaUrlSchema;
const optionalDateTime = z.string().
refine((value) => Number.isFinite(Date.parse(value)), 'Enter a valid date and time.').
transform((value) => new Date(value).toISOString()).
optional();

export const categorySchema = z.object({
  id,
  name: safeString(180).min(1),
  slug,
  description: safeString(5000),
  image: safeMediaUrlSchema.or(z.literal('')),
  parentSlug: slug.optional(),
  displayOrder: z.number().int().min(1).max(10000),
  isFeatured: z.boolean(),
  isSample: z.boolean(),
  isPublished: z.boolean(),
  updatedAt: optionalDateTime
}).strict().superRefine((value, context) => {
  if (value.isPublished && !value.image) context.addIssue({ code: z.ZodIssueCode.custom, path: ['image'], message: 'Published categories require an image.' });
  if (value.parentSlug === value.slug) context.addIssue({ code: z.ZodIssueCode.custom, path: ['parentSlug'], message: 'A category cannot be its own parent.' });
});

export const heroSlideSchema = z.object({
  id,
  order: z.number().int().min(1).max(10000),
  eyebrow: safeString(180),
  headline: safeString(240).min(1),
  subheadline: safeString(1000),
  ctaLabel: safeString(120),
  ctaHref: safeString(1000),
  image: safeMediaUrlSchema,
  mobileImage: optionalUrl,
  mediaFit: z.enum(['cover', 'contain']).optional(),
  focalPoint: safeString(120).optional(),
  overlayStrength: z.number().min(0).max(1).optional(),
  textAlign: z.enum(['left', 'center', 'right']).optional(),
  theme: z.enum(['light', 'dark']),
  isVisible: z.boolean(),
  startAt: optionalDateTime,
  endAt: optionalDateTime,
  updatedAt: optionalDateTime
}).strict().superRefine((value, context) => {
  if (value.startAt && value.endAt && value.startAt >= value.endAt) context.addIssue({ code: z.ZodIssueCode.custom, path: ['endAt'], message: 'Schedule end must be after start.' });
  if (value.ctaHref && !value.ctaHref.startsWith('/') && !/^https:\/\//.test(value.ctaHref)) context.addIssue({ code: z.ZodIssueCode.custom, path: ['ctaHref'], message: 'CTA destination must be a relative path or HTTPS URL.' });
});

export const popupSchema = z.object({
  id,
  title: safeString(240).min(1),
  message: safeString(3000).min(1),
  image: optionalUrl,
  ctaLabel: safeString(120).optional(),
  ctaHref: safeString(1000).optional(),
  isEnabled: z.boolean(),
  startAt: optionalDateTime,
  endAt: optionalDateTime,
  routes: z.array(safeString(240)).max(50),
  frequency: z.enum(['session', 'day', 'once']),
  delayMs: z.number().int().min(0).max(30000).optional(),
  priority: z.number().int().min(1).max(100).optional(),
  campaignVersion: z.number().int().min(1).max(1000000).optional(),
  updatedAt: optionalDateTime
}).strict().superRefine((value, context) => {
  if (value.startAt && value.endAt && value.startAt >= value.endAt) context.addIssue({ code: z.ZodIssueCode.custom, path: ['endAt'], message: 'Schedule end must be after start.' });
  if (value.ctaHref && !value.ctaHref.startsWith('/') && !/^https:\/\//.test(value.ctaHref)) context.addIssue({ code: z.ZodIssueCode.custom, path: ['ctaHref'], message: 'Popup destination must be a relative path or HTTPS URL.' });
});

export const cmsPageSchema = z.object({
  id,
  slug,
  title: safeString(240).min(1),
  content: safeString(50000),
  updatedAt: optionalDateTime,
  isSystem: z.boolean(),
  isPublished: z.boolean().optional()
}).strict();

export const paymentMethodSchema = z.object({
  id,
  type: z.enum(['jazzcash', 'easypaisa', 'payoneer', 'paypal', 'bank_transfer', 'crypto']),
  label: safeString(180).min(1),
  enabled: z.boolean(),
  accountTitle: safeString(240),
  accountNumber: safeString(500),
  instructions: safeString(5000),
  country: safeString(120),
  currency: safeString(20),
  qrImage: optionalUrl,
  cryptoAsset: safeString(80).optional(),
  cryptoNetwork: safeString(120).optional(),
  updatedAt: optionalDateTime
}).strict().superRefine((value, context) => {
  if (value.enabled && (!value.accountTitle || !value.accountNumber || !value.instructions)) context.addIssue({ code: z.ZodIssueCode.custom, path: ['enabled'], message: 'Enabled payment methods require account and instruction details.' });
});

export const brandSettingsSchema = z.object({
  logoText: safeString(180).min(1),
  logoTagline: safeString(240),
  logoUrl: optionalUrl,
  logoAlt: safeString(240).optional(),
  logoDesktopHeight: z.number().int().min(32).max(88).optional(),
  logoMobileHeight: z.number().int().min(28).max(64).optional(),
  logoFooterHeight: z.number().int().min(20).max(88).optional(),
  announcementText: safeString(500),
  announcementEnabled: z.boolean(),
  contactEmail: z.string().email().max(320),
  contactPhone: safeString(80),
  contactWhatsapp: safeString(80),
  contactAddress: safeString(1000),
  socialLinks: z.array(z.object({ platform: safeString(80).min(1), url: safeString(1000) }).strict()).max(20),
  currency: z.literal('PKR'),
  reviewCountdownMinutes: z.number().int().min(1).max(10080),
  shippingFee: z.number().int().min(0).max(1000000000).optional(),
  freeShippingThreshold: z.number().int().min(0).max(1000000000).optional(),
  timezone: z.literal('Asia/Karachi').optional(),
  homepageSectionOrder: z.array(safeString(120)).max(50),
  homepageSectionsEnabled: z.record(z.string(), z.boolean()).optional(),
  updatedAt: optionalDateTime
}).strict();

export const contentResourceSchema = z.enum(['categories', 'heroSlides', 'popups', 'cmsPages', 'paymentMethodsPublic']);
export type ContentResource = z.infer<typeof contentResourceSchema>;

export function parseContentItem(resource: ContentResource, item: unknown) {
  if (resource === 'categories') return categorySchema.parse(item);
  if (resource === 'heroSlides') return heroSlideSchema.parse(item);
  if (resource === 'popups') return popupSchema.parse(item);
  if (resource === 'cmsPages') return cmsPageSchema.parse(item);
  return paymentMethodSchema.parse(item);
}