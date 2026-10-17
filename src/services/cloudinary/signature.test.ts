// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { cloudinarySignature, cloudinarySignaturePayload, signaturesMatch } from './signature';

describe('Cloudinary request signing', () => {
  it('matches the documented Cloudinary signature example', () => {
    const signature = cloudinarySignature({ timestamp: 1315060510, public_id: 'sample_image', eager: 'w_400,h_300,c_pad|w_260,h_200,c_crop' }, 'abcd');
    expect(signature).toBe('bfd09f95f331f558cbd1320e67aa8d488770583e');
  });

  it('sorts parameters and excludes unsigned fields', () => {
    expect(cloudinarySignaturePayload({ timestamp: 1, api_key: 'x', file: 'y', public_id: 'a/b', resource_type: 'image', overwrite: 'false', empty: '' })).
    toBe('overwrite=false&public_id=a/b&timestamp=1');
  });

  it('compares signatures safely', () => {
    const value = cloudinarySignature({ public_id: 'a', version: 2 }, 'secret');
    expect(signaturesMatch(value, value.toUpperCase())).toBe(true);
    expect(signaturesMatch(value, value.slice(1))).toBe(false);
    expect(signaturesMatch(value, 'not-hex')).toBe(false);
  });
});