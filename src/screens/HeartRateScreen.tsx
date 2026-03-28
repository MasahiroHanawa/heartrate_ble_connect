import React, {useMemo, useState} from 'react';
import {StyleSheet, Switch, Text, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {ControlPanel} from '../components/ControlPanel';
import {DeviceList} from '../components/DeviceList';
import {HeartRateDisplay} from '../components/HeartRateDisplay';
import {useHeartRateStream} from '../hooks/useHeartRateStream';
import {BleHeartRateSource} from '../services/BleHeartRateSource';
import {MockHeartRateSource} from '../services/MockHeartRateSource';

export function HeartRateScreen() {
  const [useMock, setUseMock] = useState(false);

  // Re-create the source when toggling mock mode
  const source = useMemo(
    () => (useMock ? new MockHeartRateSource() : new BleHeartRateSource()),
    [useMock],
  );

  const {
    bpm,
    history,
    connectionState,
    devices,
    connectedDeviceName,
    startScan,
    connectToDevice,
    disconnect,
  } = useHeartRateStream(source);

  const showDeviceList =
    connectionState === 'scanning' || connectionState === 'idle';

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Heart Rate Monitor</Text>
        <View style={styles.mockToggle}>
          <Text style={styles.mockLabel}>Mock</Text>
          <Switch
            value={useMock}
            onValueChange={val => {
              disconnect();
              setUseMock(val);
            }}
          />
        </View>
      </View>

      {/* Heart rate display */}
      <HeartRateDisplay
        bpm={bpm}
        connectionState={connectionState}
        connectedDeviceName={connectedDeviceName}
        history={history}
      />

      {/* Device list (visible during scan) */}
      {showDeviceList && (
        <DeviceList devices={devices} onSelect={connectToDevice} />
      )}

      {/* Controls */}
      <ControlPanel
        connectionState={connectionState}
        onScan={startScan}
        onDisconnect={disconnect}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#ddd',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
  },
  mockToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  mockLabel: {
    fontSize: 14,
    color: '#666',
  },
});
