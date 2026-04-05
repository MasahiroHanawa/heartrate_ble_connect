import {BleManager, Device, Subscription} from 'react-native-ble-plx';
import {Platform, PermissionsAndroid} from 'react-native';
import type {
  ConnectionState,
  DiscoveredDevice,
  HeartRateSource,
} from '../types/HeartRateSource';
import {parseHeartRate} from './heartRateParser';

const HR_SERVICE_UUID = '0000180d-0000-1000-8000-00805f9b34fb';
const HR_MEASUREMENT_UUID = '00002a37-0000-1000-8000-00805f9b34fb';

const RECONNECT_BASE_DELAY_MS = 1000;
const RECONNECT_MAX_DELAY_MS = 30000;
const RECONNECT_MAX_ATTEMPTS = 5;

export class BleHeartRateSource implements HeartRateSource {
  private manager: BleManager;
  private heartRateCallbacks: Set<(bpm: number) => void> = new Set();
  private stateCallbacks: Set<(state: ConnectionState) => void> = new Set();
  private deviceCallbacks: Set<(device: DiscoveredDevice) => void> = new Set();

  private connectedDevice: Device | null = null;
  private lastDeviceId: string | null = null;
  private monitorSubscription: Subscription | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectAttempt = 0;
  private state: ConnectionState = 'idle';

  constructor() {
    this.manager = new BleManager();
  }

  async start(): Promise<void> {
    await this.requestPermissions();
    this.setState('scanning');

    this.manager.startDeviceScan(
      [HR_SERVICE_UUID],
      {allowDuplicates: false},
      (error, device) => {
        if (error) {
          console.warn('BLE scan error:', error.message);
          return;
        }
        if (device) {
          this.deviceCallbacks.forEach(cb =>
            cb({id: device.id, name: device.name ?? device.localName}),
          );
        }
      },
    );
  }

  stop(): void {
    this.manager.stopDeviceScan();
    this.cancelReconnect();
    this.cleanUpMonitor();
    this.setState('idle');
  }

  async connectToDevice(deviceId: string): Promise<void> {
    this.manager.stopDeviceScan();
    this.cancelReconnect();
    this.lastDeviceId = deviceId;
    this.reconnectAttempt = 0;
    this.setState('connecting');

    try {
      const device = await this.manager.connectToDevice(deviceId);
      await device.discoverAllServicesAndCharacteristics();
      this.connectedDevice = device;
      this.reconnectAttempt = 0;
      this.setState('connected');
      this.subscribeToHeartRate(device);
    } catch (error) {
      console.warn('BLE connect error:', error);
      this.scheduleReconnect();
    }
  }

  async disconnect(): Promise<void> {
    this.cancelReconnect();
    this.lastDeviceId = null;
    this.cleanUpMonitor();
    if (this.connectedDevice) {
      try {
        await this.manager.cancelDeviceConnection(this.connectedDevice.id);
      } catch {
        // Already disconnected – ignore
      }
      this.connectedDevice = null;
    }
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

  private subscribeToHeartRate(device: Device): void {
    this.monitorSubscription = device.monitorCharacteristicForService(
      HR_SERVICE_UUID,
      HR_MEASUREMENT_UUID,
      (error, characteristic) => {
        if (error) {
          console.warn('BLE monitor error:', error.message);
          // Device likely disconnected
          if (error.errorCode === 205 || error.errorCode === 201) {
            this.connectedDevice = null;
            this.cleanUpMonitor();
            this.scheduleReconnect();
          }
          return;
        }
        if (characteristic?.value) {
          const bpm = parseHeartRate(characteristic.value);
          this.heartRateCallbacks.forEach(cb => cb(bpm));
        }
      },
    );
  }

  private scheduleReconnect(): void {
    if (!this.lastDeviceId) {
      this.setState('disconnected');
      return;
    }

    if (this.reconnectAttempt >= RECONNECT_MAX_ATTEMPTS) {
      console.warn(
        `BLE reconnect: giving up after ${RECONNECT_MAX_ATTEMPTS} attempts`,
      );
      this.setState('disconnected');
      return;
    }

    const delay = Math.min(
      RECONNECT_BASE_DELAY_MS * Math.pow(2, this.reconnectAttempt),
      RECONNECT_MAX_DELAY_MS,
    );
    this.reconnectAttempt++;
    this.setState('reconnecting');

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      if (this.lastDeviceId && this.state === 'reconnecting') {
        this.attemptReconnect(this.lastDeviceId);
      }
    }, delay);
  }

  private async attemptReconnect(deviceId: string): Promise<void> {
    this.setState('connecting');

    try {
      const device = await this.manager.connectToDevice(deviceId);
      await device.discoverAllServicesAndCharacteristics();
      this.connectedDevice = device;
      this.reconnectAttempt = 0;
      this.setState('connected');
      this.subscribeToHeartRate(device);
    } catch (error) {
      console.warn(
        `BLE reconnect attempt ${this.reconnectAttempt} failed:`,
        error,
      );
      this.scheduleReconnect();
    }
  }

  private cancelReconnect(): void {
    if (this.reconnectTimer !== null) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.reconnectAttempt = 0;
  }

  private cleanUpMonitor(): void {
    if (this.monitorSubscription) {
      this.monitorSubscription.remove();
      this.monitorSubscription = null;
    }
  }

  private async requestPermissions(): Promise<void> {
    if (Platform.OS === 'android') {
      const apiLevel =
        typeof Platform.Version === 'number'
          ? Platform.Version
          : parseInt(String(Platform.Version), 10);

      if (apiLevel >= 31) {
        await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        ]);
      } else {
        await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        );
      }
    }
    // iOS permissions are handled via Info.plist
  }

  private setState(newState: ConnectionState): void {
    this.state = newState;
    this.stateCallbacks.forEach(cb => cb(newState));
  }
}
