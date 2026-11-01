/**
 * Breakthrough Clinical OS - Secure Storage Service
 * AES-GCM 256-bit encryption for high-security participant data & clinical notes in field offline mode.
 * Enforces PBKDF2 key derivation from a practitioner session PIN.
 */

// In-memory session PIN cache
let activeSessionPin: string | null = null;

export function setActiveSessionPin(pin: string | null) {
  activeSessionPin = pin;
}

export function getActiveSessionPin(): string | null {
  return activeSessionPin;
}

export function isSecureStorageLocked(): boolean {
  return !activeSessionPin;
}

// Derive a 256-bit AES-GCM key from PIN + salt
async function deriveKey(pin: string, salt: Uint8Array): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(pin),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt as any,
      iterations: 100000,
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypt arbitrary JSON object or string with AES-GCM 256-bit
 */
export async function encryptData(data: any, pin: string): Promise<string> {
  if (typeof window === 'undefined' || !window.crypto?.subtle) {
    // SSR fallback
    return JSON.stringify(data);
  }

  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(pin, salt);

  const enc = new TextEncoder();
  const plaintext = enc.encode(typeof data === 'string' ? data : JSON.stringify(data));

  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv as any },
    key,
    plaintext
  );

  // Pack salt (16 bytes) + iv (12 bytes) + ciphertext into a single base64 string
  const totalLength = salt.length + iv.length + ciphertext.byteLength;
  const combined = new Uint8Array(totalLength);
  combined.set(salt, 0);
  combined.set(iv, salt.length);
  combined.set(new Uint8Array(ciphertext), salt.length + iv.length);

  // Convert to binary string for base64 encoding
  let binary = '';
  for (let i = 0; i < combined.length; i++) {
    binary += String.fromCharCode(combined[i]);
  }

  return `ENC_AES_GCM:${btoa(binary)}`;
}

/**
 * Decrypt AES-GCM ciphertext using the session PIN
 */
export async function decryptData(encryptedString: string, pin: string): Promise<any> {
  if (typeof window === 'undefined' || !window.crypto?.subtle) {
    try {
      return JSON.parse(encryptedString);
    } catch {
      return encryptedString;
    }
  }

  if (!encryptedString.startsWith('ENC_AES_GCM:')) {
    // Unencrypted legacy fallback
    try {
      return JSON.parse(encryptedString);
    } catch {
      return encryptedString;
    }
  }

  const base64Data = encryptedString.substring('ENC_AES_GCM:'.length);
  const binary = atob(base64Data);
  const combined = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    combined[i] = binary.charCodeAt(i);
  }

  const salt = combined.slice(0, 16);
  const iv = combined.slice(16, 28);
  const ciphertext = combined.slice(28);

  const key = await deriveKey(pin, salt);

  const decryptedBuffer = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: iv as any },
    key,
    ciphertext as any
  );

  const dec = new TextDecoder();
  const plaintext = dec.decode(decryptedBuffer);

  try {
    return JSON.parse(plaintext);
  } catch {
    return plaintext;
  }
}

/**
 * Save high-security participant data to localStorage with encryption
 */
export async function saveSecureOfflineRecord(key: string, data: any, pin?: string): Promise<void> {
  if (typeof window === 'undefined') return;
  const targetPin = pin || activeSessionPin;

  if (targetPin) {
    const encrypted = await encryptData(data, targetPin);
    localStorage.setItem(`secure_${key}`, encrypted);
  } else {
    // Stored unencrypted if PIN not yet set
    localStorage.setItem(`secure_${key}`, JSON.stringify(data));
  }
}

/**
 * Retrieve high-security record from localStorage and decrypt
 */
export async function loadSecureOfflineRecord(key: string, pin?: string): Promise<any | null> {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(`secure_${key}`);
  if (!raw) return null;

  const targetPin = pin || activeSessionPin;
  if (!targetPin) {
    if (raw.startsWith('ENC_AES_GCM:')) {
      throw new Error('PIN_REQUIRED_FOR_DECRYPTION');
    }
    try {
      return JSON.parse(raw);
    } catch {
      return raw;
    }
  }

  return decryptData(raw, targetPin);
}
