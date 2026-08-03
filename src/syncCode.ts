const SYNC_CODE_KEY = 'gvt.syncCode.v1';
const CODE_ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';

function randomChar(): string {
  return CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
}

export function generateSyncCode(): string {
  return Array.from({ length: 3 }, () => Array.from({ length: 4 }, randomChar).join('')).join('-');
}

export function normalizeSyncCode(input: string): string {
  const cleaned = input.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  const groups = [cleaned.slice(0, 4), cleaned.slice(4, 8), cleaned.slice(8, 12)].filter(Boolean);
  return groups.join('-');
}

export function getSyncCode(): string | null {
  return localStorage.getItem(SYNC_CODE_KEY);
}

export function setSyncCode(code: string | null): void {
  if (code) localStorage.setItem(SYNC_CODE_KEY, code);
  else localStorage.removeItem(SYNC_CODE_KEY);
}
