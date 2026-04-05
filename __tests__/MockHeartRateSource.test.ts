import {MockHeartRateSource} from '../src/services/MockHeartRateSource';

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('MockHeartRateSource', () => {
  it('starts in idle state', () => {
    const source = new MockHeartRateSource();
    const stateCallback = jest.fn();
    source.onConnectionStateChange(stateCallback);

    // Should immediately emit current state
    expect(stateCallback).toHaveBeenCalledWith('idle');
  });

  it('transitions to scanning on start', () => {
    const source = new MockHeartRateSource();
    const stateCallback = jest.fn();
    source.onConnectionStateChange(stateCallback);

    source.start();
    expect(stateCallback).toHaveBeenCalledWith('scanning');
  });

  it('discovers mock devices during scan', () => {
    const source = new MockHeartRateSource();
    const deviceCallback = jest.fn();
    source.onDeviceFound(deviceCallback);

    source.start();

    // Advance timers to trigger device discovery
    jest.advanceTimersByTime(1500);

    expect(deviceCallback).toHaveBeenCalledTimes(2);
    expect(deviceCallback).toHaveBeenCalledWith(
      expect.objectContaining({id: 'mock-device-1', name: 'Mock HR Sensor'}),
    );
    expect(deviceCallback).toHaveBeenCalledWith(
      expect.objectContaining({id: 'mock-device-2', name: 'Mock Garmin'}),
    );
  });

  it('transitions through connecting -> connected on connectToDevice', async () => {
    const source = new MockHeartRateSource();
    const states: string[] = [];
    source.onConnectionStateChange(state => states.push(state));

    source.start();

    const connectPromise = source.connectToDevice('mock-device-1');
    // Advance past the 800ms simulated connection delay
    jest.advanceTimersByTime(1000);
    await connectPromise;

    expect(states).toContain('connecting');
    expect(states).toContain('connected');
  });

  it('emits heart rate values after connection', async () => {
    const source = new MockHeartRateSource();
    const hrCallback = jest.fn();
    source.onHeartRate(hrCallback);

    const connectPromise = source.connectToDevice('mock-device-1');
    jest.advanceTimersByTime(1000);
    await connectPromise;

    // Advance timers to trigger heart rate generation (500-1000ms intervals)
    jest.advanceTimersByTime(2000);

    expect(hrCallback).toHaveBeenCalled();
    const bpm = hrCallback.mock.calls[0][0];
    expect(bpm).toBeGreaterThanOrEqual(60);
    expect(bpm).toBeLessThanOrEqual(90);
  });

  it('stops emitting after disconnect', async () => {
    const source = new MockHeartRateSource();
    const hrCallback = jest.fn();
    source.onHeartRate(hrCallback);

    const connectPromise = source.connectToDevice('mock-device-1');
    jest.advanceTimersByTime(1000);
    await connectPromise;

    await source.disconnect();
    hrCallback.mockClear();

    jest.advanceTimersByTime(3000);
    expect(hrCallback).not.toHaveBeenCalled();
  });

  it('unsubscribes callbacks correctly', () => {
    const source = new MockHeartRateSource();
    const stateCallback = jest.fn();
    const unsub = source.onConnectionStateChange(stateCallback);

    unsub();
    stateCallback.mockClear();

    source.start();
    // Should not receive scanning state after unsubscribe
    expect(stateCallback).not.toHaveBeenCalled();
  });

  it('transitions to idle on stop', () => {
    const source = new MockHeartRateSource();
    const states: string[] = [];
    source.onConnectionStateChange(state => states.push(state));

    source.start();
    source.stop();

    expect(states[states.length - 1]).toBe('idle');
  });
});
