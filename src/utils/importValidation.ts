import { z } from 'zod';
import { safeMediaUrlSchema } from './mediaUrl';

const safeString = (maximum: number) => z.string().trim().max(maximum).regex(/^(?!(?:__proto__|constructor|prototype)$).*/, 'Unsafe property value.');
const categorySchema = z.object({ id: safeString(120), name: safeString(180).min(1), slug: safeString(180).min(1), description: safeString(2000), image: safeMediaUrlSchema.or(z.literal('')), parentSlug: safeString(180).optional(), displayOrder: z.number().int().min(0).max(100000), isFeatured: z.boolean(), isSample: z.boolean(), isPublished: z.boolean(), updatedAt: z.string().datetime().optional() }).strict();
const variantSchema = z.object({ id: safeString(120), label: safeString(180), optionValues: z.record(safeString(120), safeString(180)), sku: safeString(120), stock: z.number().int().min(0).max(1000000), priceOverride: z.number().int().min(0).max(1000000000).optional() }).strict();
const productSchema = z.object({ id: safeString(120), name: safeString(180).min(1), slug: safeString(180).min(1), sku: safeString(120).min(1), categorySlugs: z.array(safeString(180)).min(1).max(20), description: safeString(10000), price: z.number().int().min(0).max(1000000000), compareAtPrice: z.number().int().min(0).max(1000000000).optional(), costPrice: z.number().int().min(0).max(1000000000).optional(), currency: z.literal('PKR'), stock: z.number().int().min(0).max(1000000), variantOptions: z.array(z.object({ name: safeString(120), values: z.array(safeString(180)).max(100) }).strict()).max(10), variants: z.array(variantSchema).max(500), specifications: z.array(z.object({ label: safeString(180), value: safeString(1000) }).strict()).max(200), images: z.array(safeMediaUrlSchema).max(30), videoUrl: safeMediaUrlSchema.optional(), seoTitle: safeString(180), seoDescription: safeString(320), isFeatured: z.boolean(), isNewArrival: z.boolean(), isSample: z.boolean(), isPublished: z.boolean(), isVerified: z.boolean(), createdAt: z.string().datetime(), updatedAt: z.string().datetime() }).strict();
export const backupSchema = z.object({ schemaVersion: z.number().int().min(1).max(3), exportedAt: z.string().datetime(), categories: z.array(categorySchema).max(5000), products: z.array(productSchema).max(25000) }).passthrough();
export type ValidBackup = z.infer<typeof backupSchema>;

export function validateBackup(input: unknown): {ok: true;data: ValidBackup;warnings: string[];} | {ok: false;errors: string[];} {
  const result = backupSchema.safeParse(input);
  if (!result.success) return { ok: false, errors: result.error.issues.slice(0, 20).map((issue) => `${issue.path.join('.') || 'backup'}: ${issue.message}`) };
  const categorySlugs = new Set(result.data.categories.map((category) => category.slug));
  const broken = result.data.products.flatMap((product) => product.categorySlugs.filter((slug) => !categorySlugs.has(slug)).map((slug) => `${product.id} → ${slug}`));
  if (broken.length) return { ok: false, errors: [`Missing category references: ${broken.slice(0, 20).join(', ')}`] };
  return { ok: true, data: result.data, warnings: result.data.schemaVersion < 3 ? ['This backup requires migration to schema version 3 before persistence.'] : [] };
}