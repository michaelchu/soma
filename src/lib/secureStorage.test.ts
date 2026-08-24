import { beforeEach, describe, expect, it, vi } from 'vitest';
import { secureGetItem, secureHasItem, secureRemoveItem, secureSetItem } from './secureStorage';

describe('secure local storage wrapper', () => {
  const values = new Map<string, string>();
  const storage = {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  };

  beforeEach(() => {
    values.clear();
    vi.stubGlobal('localStorage', storage);
  });

  it('round-trips values and supports existence/removal', () => {
    secureSetItem('prefs', { fontSize: 18 });
    expect(secureGetItem('prefs')).toEqual({ fontSize: 18 });
    expect(secureHasItem('prefs')).toBe(true);
    secureRemoveItem('prefs');
    expect(secureHasItem('prefs')).toBe(false);
  });

  it('rejects corrupted, tampered, and versioned records', () => {
    secureSetItem('prefs', { fontSize: 18 });
    const stored = JSON.parse(localStorage.getItem('prefs')!);
    stored.data.fontSize = 24;
    localStorage.setItem('prefs', JSON.stringify(stored));
    expect(secureGetItem('prefs')).toBeNull();

    localStorage.setItem('old', JSON.stringify({ data: {}, checksum: '', version: 0 }));
    expect(secureGetItem('old')).toBeNull();
    localStorage.setItem('malformed', '{');
    expect(secureGetItem('malformed')).toBeNull();
  });
});
