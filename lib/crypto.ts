import CryptoJS from 'crypto-js';

const SECRET_KEY = process.env.NEXT_PUBLIC_HASH_SECRET || 'identity-matcher-secret';

export function hashUrl(url: string): string {
  return CryptoJS.SHA256(url + SECRET_KEY).toString();
}

export function compareUrls(url1: string, url2: string): boolean {
  const hash1 = hashUrl(url1);
  const hash2 = hashUrl(url2);
  return hash1 === hash2;
}

export function generateVerificationToken(address: string): string {
  const timestamp = Date.now().toString();
  return CryptoJS.SHA256(address + timestamp + SECRET_KEY).toString();
}
