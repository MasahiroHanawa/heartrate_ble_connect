/**
 * Utilities for parsing BLE Heart Rate Measurement data.
 * See Bluetooth SIG specification for characteristic 0x2A37.
 */

/** Decode a base64 string into a byte array. */
export function base64ToBytes(base64: string): number[] {
  const chars =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const bytes: number[] = [];
  let buffer = 0;
  let bits = 0;
  for (const char of base64) {
    if (char === '=') {
      break;
    }
    const val = chars.indexOf(char);
    if (val === -1) {
      continue;
    }
    buffer = (buffer << 6) | val;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      bytes.push((buffer >> bits) & 0xff);
    }
  }
  return bytes;
}

/**
 * Parse heart rate from the BLE Heart Rate Measurement characteristic value.
 * @param base64Value - Base64-encoded characteristic value
 * @returns Heart rate in BPM
 */
export function parseHeartRate(base64Value: string): number {
  const data = base64ToBytes(base64Value);
  const flags = data[0];
  const is16Bit = (flags & 0x01) !== 0;

  if (is16Bit) {
    return data[1] | (data[2] << 8);
  }
  return data[1];
}
