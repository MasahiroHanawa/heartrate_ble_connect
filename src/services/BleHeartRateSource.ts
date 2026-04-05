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

export class BleHeartRateSource implements HeartRateSource {
  private manager: BleManager;
  private heartRateCallbacks: Set<(bpm: number) => void> = new Set();
  private stateCallbacks: Set<(state: ConnectionState) => void> = new Set();
  private deviceCallbacks: Set<(device: DiscoveredDevice) => void> = new Set();

  private connectedDevice: Device | null = null;
  private monitorSubscription: Subscription | null = null;
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
    this.cleanUpMonitor();
    this.setState('idle');
  }

  async connectToDevice(deviceId: string): Promise<void> {
    this.manager.stopDeviceScan();
    this.setState('connecting');

    try {
      const device = await this.manager.connectToDevice(deviceId);
      await device.discoverAllServicesAndCharacteristics();
      this.connectedDevice = device;
      this.setState('connected');
      this.subscribeToHeartRate(device);
    } catch (error) {
      console.warn('BLE connect error:', error);
      this.setState('disconnected');
    }
  }

  async disconnect(): Promise<void> {
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
            this.setState('disconnected');
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
