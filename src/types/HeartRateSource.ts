/**
 * Abstract interface for heart rate data sources.
 *
 * Implementations can be swapped between BLE (JS or native module) and mock
 * without changing consumer code.
 */

export type ConnectionState =
  | 'idle'
  | 'scanning'
  | 'connecting'
  | 'connected'
  | 'disconnected';

export interface HeartRateSource {
  /** Begin scanning / generating data. */
  start(): void;

  /** Stop and clean up all subscriptions. */
  stop(): void;

  /** Subscribe to heart rate values (bpm). Returns an unsubscribe function. */
  onHeartRate(callback: (bpm: number) => void): () => void;

  /** Subscribe to connection state changes. Returns an unsubscribe function. */
  onConnectionStateChange(
    callback: (state: ConnectionState) => void,
  ): () => void;

  /** Connect to a specific device by id. */
  connectToDevice(deviceId: string): Promise<void>;

  /** Disconnect from the current device. */
  disconnect(): Promise<void>;

  /** Subscribe to discovered devices during scan. Returns an unsubscribe function. */
  onDeviceFound?(
    callback: (device: DiscoveredDevice) => void,
  ): () => void;
}

export interface DiscoveredDevice {
  id: string;
  name: string | null;
}
