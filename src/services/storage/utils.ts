
export const sanitizeData = (value: any): any => {
  const seen = new WeakSet<object>();

  const walk = (val: any): any => {
    if (Array.isArray(val)) {
      if (seen.has(val)) return null;
      seen.add(val);
      return val.map(walk).filter(v => v !== undefined);
    }

    if (val && typeof val === 'object') {
      if (val instanceof Date) return val;

      // Preserve Firestore Timestamp-like objects.
      if (typeof val.toDate === 'function' && typeof val.seconds === 'number') return val;
      if (typeof val.toDate === 'function' && typeof val._seconds === 'number') return val;

      // Preserve GeoPoint-like objects.
      if (typeof val.latitude === 'number' && typeof val.longitude === 'number') return val;

      if (seen.has(val)) return null;
      seen.add(val);

      const out: any = {};
      for (const [k, v] of Object.entries(val)) {
        const sanitized = walk(v);
        if (sanitized !== undefined) out[k] = sanitized;
      }
      return out;
    }

    return val;
  };

  return walk(value);
};
