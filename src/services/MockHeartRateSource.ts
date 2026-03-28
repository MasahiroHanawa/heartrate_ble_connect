import type {
  ConnectionState,
  DiscoveredDevice,
  HeartRateSource,
} from '../types/HeartRateSource';

const MOCK_DEVICES: DiscoveredDevice[] = [
  {id: 'mock-device-1', name: 'Mock HR Sensor'},
  {id: 'mock-device-2', name: 'Mock Garmin'},
];

export class MockHeartRateSource implements HeartRateSource {
  private heartRateCallbacks: Set<(bpm: number) => void> = new Set();
  private stateCallbacks: Set<(state: ConnectionState) => void> = new Set();
  private deviceCallbacks: Set<(device: DiscoveredDevice) => void> = new Set();

  private intervalId: ReturnType<typeof setInterval> | null = null;
  private scanTimeoutId: ReturnType<typeof setTimeout> | null = null;
  private currentBpm = 72;
  private state: ConnectionState = 'idle';

  start(): void {
    this.setState('scanning');

    // Simulate device discovery with slight delays
    let index = 0;
    this.scanTimeoutId = setInterval(() => {
      if (index < MOCK_DEVICES.length) {
        this.deviceCallbacks.forEach(cb => cb(MOCK_DEVICES[index]));
        index++;
      } else {
        if (this.scanTimeoutId !== null) {
          clearInterval(this.scanTimeoutId);
          this.scanTimeoutId = null;
        }
      }
    }, 500);
  }

  stop(): void {
    this.cleanUp();
    this.setState('idle');
  }

  async connectToDevice(_deviceId: string): Promise<void> {
    this.setState('connecting');

    // Simulate connection delay
    await new Promise<void>(resolve => setTimeout(resolve, 800));

    this.setState('connected');
    this.startGenerating();
  }

  async disconnect(): Promise<void> {
    this.cleanUp();
    this.setState('disconnected');
  }

  onHeartRate(callback: (bpm: number) => void): () => void {
    this.heartRateCallbacks.add(callback);
    return () => {
      this.heartRateCallbacks.delete(callback);
    };
  }

  onConnectionStateChange(
    callback: (state: ConnectionState) => void,
  ): () => void {
    this.stateCallbacks.add(callback);
    // Emit current state immediately
    callback(this.state);
    return () => {
      this.stateCallbacks.delete(callback);
    };
  }

  onDeviceFound(callback: (device: DiscoveredDevice) => void): () => void {
    this.deviceCallbacks.add(callback);
    return () => {
      this.deviceCallbacks.delete(callback);
    };
  }

  // --- private ---

  private startGenerating(): void {
    const randomInterval = () => 500 + Math.random() * 500; // 500–1000 ms

    const tick = () => {
      // Small fluctuation: ±2 bpm, clamped to 60–90
      const delta = Math.floor(Math.random() * 5) - 2;
      this.currentBpm = Math.max(60, Math.min(90, this.currentBpm + delta));
      this.heartRateCallbacks.forEach(cb => cb(this.currentBpm));

      this.intervalId = setTimeout(tick, randomInterval());
    };

    this.intervalId = setTimeout(tick, randomInterval());
  }

  private cleanUp(): void {
    if (this.intervalId !== null) {
      clearTimeout(this.intervalId);
      this.intervalId = null;
    }
    if (this.scanTimeoutId !== null) {
      clearInterval(this.scanTimeoutId);
      this.scanTimeoutId = null;
    }
  }

  private setState(newState: ConnectionState): void {
    this.state = newState;
    this.stateCallbacks.forEach(cb => cb(newState));
  }
}
