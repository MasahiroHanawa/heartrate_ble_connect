import {useCallback, useEffect, useRef, useState} from 'react';
import type {
  ConnectionState,
  DiscoveredDevice,
  HeartRateSource,
} from '../types/HeartRateSource';

const MAX_HISTORY = 20;

export interface HeartRateStream {
  /** Latest heart rate value in bpm, or null if not yet received. */
  bpm: number | null;
  /** Recent history (newest first), capped at MAX_HISTORY entries. */
  history: number[];
  /** Current connection state. */
  connectionState: ConnectionState;
  /** Devices found during scan. */
  devices: DiscoveredDevice[];
  /** Name of the connected device (if any). */
  connectedDeviceName: string | null;
  /** Start scanning for devices. */
  startScan: () => void;
  /** Connect to a discovered device. */
  connectToDevice: (device: DiscoveredDevice) => void;
  /** Disconnect from current device and stop. */
  disconnect: () => void;
}

export function useHeartRateStream(source: HeartRateSource): HeartRateStream {
  const [bpm, setBpm] = useState<number | null>(null);
  const [history, setHistory] = useState<number[]>([]);
  const [connectionState, setConnectionState] =
    useState<ConnectionState>('idle');
  const [devices, setDevices] = useState<DiscoveredDevice[]>([]);
  const [connectedDeviceName, setConnectedDeviceName] = useState<string | null>(
    null,
  );

  // Track mount state to prevent updates after unmount
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Subscribe to connection state
  useEffect(() => {
    const unsub = source.onConnectionStateChange(state => {
      if (mountedRef.current) {
        setConnectionState(state);
      }
    });
    return unsub;
  }, [source]);

  // Subscribe to heart rate values
  useEffect(() => {
    const unsub = source.onHeartRate(value => {
      if (!mountedRef.current) {
        return;
      }
      setBpm(value);
      setHistory(prev => {
        const next = [value, ...prev];
        return next.length > MAX_HISTORY ? next.slice(0, MAX_HISTORY) : next;
      });
    });
    return unsub;
  }, [source]);

  // Subscribe to device discovery
  useEffect(() => {
    if (!source.onDeviceFound) {
      return;
    }
    const unsub = source.onDeviceFound(device => {
      if (!mountedRef.current) {
        return;
      }
      setDevices(prev => {
        if (prev.some(d => d.id === device.id)) {
          return prev;
        }
        return [...prev, device];
      });
    });
    return unsub;
  }, [source]);

  const startScan = useCallback(() => {
    setDevices([]);
    setBpm(null);
    setHistory([]);
    setConnectedDeviceName(null);
    source.start();
  }, [source]);

  const connectToDevice = useCallback(
    (device: DiscoveredDevice) => {
      setConnectedDeviceName(device.name ?? device.id);
      source.connectToDevice(device.id);
    },
    [source],
  );

  const disconnect = useCallback(() => {
    source.disconnect();
    setBpm(null);
    setHistory([]);
    setConnectedDeviceName(null);
  }, [source]);

  // Clean up source on unmount
  useEffect(() => {
    return () => {
      source.stop();
    };
  }, [source]);

  return {
    bpm,
    history,
    connectionState,
    devices,
    connectedDeviceName,
    startScan,
    connectToDevice,
    disconnect,
  };
}
