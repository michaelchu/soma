/**
 * Secure localStorage wrapper with data integrity checking
 * Uses simple checksum validation to detect tampering or corruption
 */

interface StorageValue<T> {
  data: T;
  checksum: string;
  version: number;
}

const STORAGE_VERSION = 1;

/**
 * Simple hash function for checksum generation
 * Not cryptographically secure, but sufficient for detecting corruption/tampering
 */
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return hash.toString(36);
}

/**
 * Calculate checksum for data
 */
function calculateChecksum(data: string): string {
  return simpleHash(data + STORAGE_VERSION.toString());
}

/**
 * Securely store data in localStorage with integrity checking
 */
export function secureSetItem<T>(key: string, value: T): void {
  try {
    const dataStr = JSON.stringify(value);
    const checksum = calculateChecksum(dataStr);

    const storageValue: StorageValue<T> = {
      data: value,
      checksum,
      version: STORAGE_VERSION,
    };

    localStorage.setItem(key, JSON.stringify(storageValue));
  } catch (error) {
    console.error(`Failed to store ${key}:`, error);
    throw new Error(`Failed to store data in localStorage: ${key}`);
  }
}

/**
 * Securely retrieve data from localStorage with integrity checking
 * Returns null if data is missing, corrupted, or tampered with
 */
export function secureGetItem<T>(key: string): T | null {
  try {
    const stored = localStorage.getItem(key);
    if (!stored) return null;

    const storageValue: StorageValue<T> = JSON.parse(stored);

    // Validate structure
    if (!storageValue || typeof storageValue !== 'object') {
      console.warn(`Invalid storage structure for ${key}`);
      localStorage.removeItem(key); // Clean up corrupted data
      return null;
    }

    // Validate version
    if (storageValue.version !== STORAGE_VERSION) {
      console.warn(
        `Version mismatch for ${key} (expected ${STORAGE_VERSION}, got ${storageValue.version})`
      );
      localStorage.removeItem(key); // Clean up old version
      return null;
    }

    // Validate checksum
    const dataStr = JSON.stringify(storageValue.data);
    const expectedChecksum = calculateChecksum(dataStr);

    if (storageValue.checksum !== expectedChecksum) {
      console.error(`Checksum validation failed for ${key} - data may be corrupted or tampered`);
      localStorage.removeItem(key); // Clean up corrupted data
      return null;
    }

    return storageValue.data;
  } catch (error) {
    console.error(`Failed to retrieve ${key}:`, error);
    localStorage.removeItem(key); // Clean up corrupted data
    return null;
  }
}

/**
 * Remove item from localStorage
 */
export function secureRemoveItem(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.error(`Failed to remove ${key}:`, error);
  }
}

/**
 * Check if an item exists in localStorage
 */
export function secureHasItem(key: string): boolean {
  return secureGetItem(key) !== null;
}
