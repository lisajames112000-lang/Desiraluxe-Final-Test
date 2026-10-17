import { z } from 'zod';

const sameSiteAssetPattern = /^\/(?!\/)(?!.*(?:^|\/)\.\.(?:\/|$))[A-Za-z0-9._~!$&'()*+,;=:@%/-]+(?:\?[A-Za-z0-9._~!$&'()*+,;=:@%/?-]*)?(?:#[A-Za-z0-9._~!$&'()*+,;=:@%/?-]*)?$/;

export const safeMediaUrlSchema = z.string().trim().superRefine((value, context) => {
  if (sameSiteAssetPattern.test(value)) return;
  try {
    const parsed = new URL(value);
    if (parsed.protocol === 'https:' && parsed.username === '' && parsed.password === '') return;
  } catch {

    // The issue below intentionally covers malformed absolute and relative URLs.
  }context.addIssue({
    code: z.ZodIssueCode.custom,
    message: 'Use an HTTPS URL or a safe root-relative asset path.'
  });
});

export const optionalMediaUrlSchema = z.preprocess(
  (value) => value === '' || value === null ? undefined : value,
  safeMediaUrlSchema.optional()
);