import { describe, expect, it } from 'vitest';
import { sanitizeData } from './utils';

describe('sanitizeData', () => {
  it('removes undefined from arrays (Firestore-safe)', () => {
    const input = { a: [1, undefined, 2] };
    expect(sanitizeData(input)).toEqual({ a: [1, 2] });
  });

  it('handles circular references without throwing', () => {
    const obj: any = { a: 1 };
    obj.self = obj;

    const sanitized = sanitizeData(obj);

    expect(sanitized).toMatchObject({ a: 1 });
    expect(sanitized.self).toBeNull();
  });
});

