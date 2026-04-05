import {renderHook, act} from '@testing-library/react-native';
import {useHeartRateStream} from '../src/hooks/useHeartRateStream';
import type {
  ConnectionState,
  DiscoveredDevice,
  HeartRateSource,
} from '../src/types/HeartRateSource';

/** Minimal fake source for testing the hook in isolation. */
function createFakeSource(): HeartRateSource & {
  emitHeartRate: (bpm: number) => void;
  emitState: (state: ConnectionState) => void;
  emitDevice: (device: DiscoveredDevice) => void;
} {
  const hrCallbacks = new Set<(bpm: number) => void>();
  const stateCallbacks = new Set<(state: ConnectionState) => void>();
  const deviceCallbacks = new Set<(device: DiscoveredDevice) => void>();
  let currentState: ConnectionState = 'idle';

  return {
    start: jest.fn(),
    stop: jest.fn(),
    connectToDevice: jest.fn().mockResolvedValue(undefined),
    disconnect: jest.fn().mockResolvedValue(undefined),

    onHeartRate(cb) {
      hrCallbacks.add(cb);
      return () => hrCallbacks.delete(cb);
    },
    onConnectionStateChange(cb) {
      stateCallbacks.add(cb);
      cb(currentState);
      return () => stateCallbacks.delete(cb);
    },
    onDeviceFound(cb) {
      deviceCallbacks.add(cb);
      return () => deviceCallbacks.delete(cb);
    },

    emitHeartRate(bpm: number) {
      hrCallbacks.forEach(cb => cb(bpm));
    },
    emitState(state: ConnectionState) {
      currentState = state;
      stateCallbacks.forEach(cb => cb(state));
    },
    emitDevice(device: DiscoveredDevice) {
      deviceCallbacks.forEach(cb => cb(device));
    },
  };
}

describe('useHeartRateStream', () => {
  it('starts with initial state', () => {
    const source = createFakeSource();
    const {result} = renderHook(() => useHeartRateStream(source));

    expect(result.current.bpm).toBeNull();
    expect(result.current.history).toEqual([]);
    expect(result.current.connectionState).toBe('idle');
    expect(result.current.devices).toEqual([]);
    expect(result.current.connectedDeviceName).toBeNull();
  });

  it('updates bpm and history when heart rate is emitted', () => {
    const source = createFakeSource();
    const {result} = renderHook(() => useHeartRateStream(source));

    act(() => source.emitHeartRate(72));

    expect(result.current.bpm).toBe(72);
    expect(result.current.history).toEqual([72]);

    act(() => source.emitHeartRate(75));

    expect(result.current.bpm).toBe(75);
    expect(result.current.history).toEqual([75, 72]);
  });

  it('caps history at 20 entries', () => {
    const source = createFakeSource();
    const {result} = renderHook(() => useHeartRateStream(source));

    act(() => {
      for (let i = 1; i <= 25; i++) {
        source.emitHeartRate(60 + i);
      }
    });

    expect(result.current.history).toHaveLength(20);
    // Most recent should be first
    expect(result.current.history[0]).toBe(85);
  });

  it('updates connection state', () => {
    const source = createFakeSource();
    const {result} = renderHook(() => useHeartRateStream(source));

    act(() => source.emitState('scanning'));
    expect(result.current.connectionState).toBe('scanning');

    act(() => source.emitState('connected'));
    expect(result.current.connectionState).toBe('connected');
  });

  it('accumulates discovered devices without duplicates', () => {
    const source = createFakeSource();
    const {result} = renderHook(() => useHeartRateStream(source));

    const device1 = {id: 'dev-1', name: 'Sensor A'};
    const device2 = {id: 'dev-2', name: 'Sensor B'};

    act(() => {
      source.emitDevice(device1);
      source.emitDevice(device2);
      source.emitDevice(device1); // duplicate
    });

    expect(result.current.devices).toHaveLength(2);
  });

  it('calls source.start on startScan and resets state', () => {
    const source = createFakeSource();
    const {result} = renderHook(() => useHeartRateStream(source));

    // Add some data first
    act(() => source.emitHeartRate(72));

    act(() => result.current.startScan());

    expect(source.start).toHaveBeenCalled();
    expect(result.current.bpm).toBeNull();
    expect(result.current.history).toEqual([]);
    expect(result.current.devices).toEqual([]);
  });

  it('calls source.disconnect on disconnect and resets data', () => {
    const source = createFakeSource();
    const {result} = renderHook(() => useHeartRateStream(source));

    act(() => source.emitHeartRate(72));

    act(() => result.current.disconnect());

    expect(source.disconnect).toHaveBeenCalled();
    expect(result.current.bpm).toBeNull();
    expect(result.current.history).toEqual([]);
    expect(result.current.connectedDeviceName).toBeNull();
  });

  it('sets connectedDeviceName on connectToDevice', () => {
    const source = createFakeSource();
    const {result} = renderHook(() => useHeartRateStream(source));

    const device = {id: 'dev-1', name: 'My Sensor'};
    act(() => result.current.connectToDevice(device));

    expect(result.current.connectedDeviceName).toBe('My Sensor');
    expect(source.connectToDevice).toHaveBeenCalledWith('dev-1');
  });

  it('uses device id as name when name is null', () => {
    const source = createFakeSource();
    const {result} = renderHook(() => useHeartRateStream(source));

    const device = {id: 'dev-1', name: null};
    act(() => result.current.connectToDevice(device));

    expect(result.current.connectedDeviceName).toBe('dev-1');
  });

  it('calls source.stop on unmount', () => {
    const source = createFakeSource();
    const {unmount} = renderHook(() => useHeartRateStream(source));

    unmount();

    expect(source.stop).toHaveBeenCalled();
  });
});
