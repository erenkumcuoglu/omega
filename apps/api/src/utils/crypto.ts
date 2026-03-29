import crypto from 'crypto';
import { ENCRYPTION_CONFIG } from '@omega/shared';

export class CryptoService {
  private static readonly algorithm = ENCRYPTION_CONFIG.ALGORITHM;
  private static readonly keyLength = ENCRYPTION_CONFIG.KEY_LENGTH;
  private static readonly ivLength = ENCRYPTION_CONFIG.IV_LENGTH;
  private static readonly tagLength = ENCRYPTION_CONFIG.TAG_LENGTH;

  private static getKey(): Buffer {
    const keyHex = process.env.ENCRYPTION_KEY;
    if (!keyHex || keyHex.length !== this.keyLength * 2) {
      throw new Error('Invalid encryption key. Must be 32 bytes (64 hex characters)');
    }
    return Buffer.from(keyHex, 'hex');
  }

  static encrypt(plaintext: string): string {
    const key = this.getKey();
    const iv = crypto.randomBytes(this.ivLength);
    
    const cipher = crypto.createCipher(this.algorithm, key);
    cipher.setAAD(Buffer.from('omega-digital', 'utf8'));
    
    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const tag = cipher.getAuthTag();
    
    // Combine iv + tag + encrypted data
    return iv.toString('hex') + tag.toString('hex') + encrypted;
  }

  static decrypt(ciphertext: string): string {
    const key = this.getKey();
    
    // Extract iv, tag, and encrypted data
    const ivHex = ciphertext.slice(0, this.ivLength * 2);
    const tagHex = ciphertext.slice(this.ivLength * 2, (this.ivLength + this.tagLength) * 2);
    const encryptedHex = ciphertext.slice((this.ivLength + this.tagLength) * 2);
    
    const iv = Buffer.from(ivHex, 'hex');
    const tag = Buffer.from(tagHex, 'hex');
    
    const decipher = crypto.createDecipher(this.algorithm, key);
    decipher.setAAD(Buffer.from('omega-digital', 'utf8'));
    decipher.setAuthTag(tag);
    
    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }

  static timingSafeEqual(a: string, b: string): boolean {
    if (a.length !== b.length) {
      return false;
    }
    
    return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
  }
}
