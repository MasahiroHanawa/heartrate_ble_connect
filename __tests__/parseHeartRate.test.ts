import {base64ToBytes, parseHeartRate} from '../src/services/heartRateParser';

/**
 * Bluetooth SIG Heart Rate Measurement (0x2A37) format:
 * - Byte 0: Flags (bit 0 = 0 for 8-bit BPM, 1 for 16-bit BPM)
 * - Byte 1 (8-bit) or Bytes 1-2 (16-bit little-endian): Heart rate value
 */

/** Helper: encode a byte array to base64. */
function bytesToBase64(bytes: number[]): string {
  const chars =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let result = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const b0 = bytes[i];
    const b1 = bytes[i + 1] ?? 0;
    const b2 = bytes[i + 2] ?? 0;
    const triplet = (b0 << 16) | (b1 << 8) | b2;
    result += chars[(triplet >> 18) & 0x3f];
    result += chars[(triplet >> 12) & 0x3f];
    result += i + 1 < bytes.length ? chars[(triplet >> 6) & 0x3f] : '=';
    result += i + 2 < bytes.length ? chars[triplet & 0x3f] : '=';
  }
  return result;
}

describe('base64ToBytes', () => {
  it('decodes a simple base64 string', () => {
    // "AABC" in base64 = [0x00, 0x00, 0x42] -> but let's use known values
    const bytes = [0x00, 0x48];
    const encoded = bytesToBase64(bytes);
    expect(base64ToBytes(encoded)).toEqual(bytes);
  });

  it('handles padding correctly', () => {
    const bytes = [0x01];
    const encoded = bytesToBase64(bytes);
    expect(encoded).toContain('=');
    expect(base64ToBytes(encoded)).toEqual(bytes);
  });

  it('returns empty array for empty string', () => {
    expect(base64ToBytes('')).toEqual([]);
  });
});

describe('parseHeartRate', () => {
  it('parses 8-bit heart rate (flags bit 0 = 0)', () => {
    // Flags = 0x00 (8-bit), BPM = 72
    const encoded = bytesToBase64([0x00, 72]);
    expect(parseHeartRate(encoded)).toBe(72);
  });

  it('parses 8-bit heart rate at boundary values', () => {
    // BPM = 0
    expect(parseHeartRate(bytesToBase64([0x00, 0]))).toBe(0);
    // BPM = 255 (max for 8-bit)
    expect(parseHeartRate(bytesToBase64([0x00, 255]))).toBe(255);
  });

  it('parses 16-bit heart rate (flags bit 0 = 1)', () => {
    // Flags = 0x01 (16-bit), BPM = 280 = 0x0118 -> little-endian: [0x18, 0x01]
    const encoded = bytesToBase64([0x01, 0x18, 0x01]);
    expect(parseHeartRate(encoded)).toBe(280);
  });

  it('parses 16-bit heart rate with low value', () => {
    // Flags = 0x01 (16-bit), BPM = 65 = 0x0041 -> little-endian: [0x41, 0x00]
    const encoded = bytesToBase64([0x01, 0x41, 0x00]);
    expect(parseHeartRate(encoded)).toBe(65);
  });

  it('ignores extra flag bits for BPM format detection', () => {
    // Flags = 0x16 (bit 0 = 0, other bits set), BPM = 80
    const encoded = bytesToBase64([0x16, 80]);
    expect(parseHeartRate(encoded)).toBe(80);

    // Flags = 0x17 (bit 0 = 1, other bits set), BPM = 100 little-endian
    const encoded16 = bytesToBase64([0x17, 100, 0]);
    expect(parseHeartRate(encoded16)).toBe(100);
  });
});
