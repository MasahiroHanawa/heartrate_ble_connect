import React from 'react';
import {StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import type {ConnectionState} from '../types/HeartRateSource';

interface Props {
  connectionState: ConnectionState;
  onScan: () => void;
  onDisconnect: () => void;
}

export const ControlPanel = React.memo(function ControlPanel({
  connectionState,
  onScan,
  onDisconnect,
}: Props) {
  const isConnected = connectionState === 'connected';
  const isReconnecting = connectionState === 'reconnecting';
  const isScanning = connectionState === 'scanning';
  const isBusy = connectionState === 'connecting';

  return (
    <View style={styles.container}>
      {!isConnected && !isReconnecting && (
        <TouchableOpacity
          style={[styles.button, styles.scanButton]}
          onPress={onScan}
          disabled={isScanning || isBusy}>
          <Text style={styles.buttonText}>
            {isScanning ? 'Scanning...' : 'Scan'}
          </Text>
        </TouchableOpacity>
      )}

      {(isConnected || isReconnecting) && (
        <TouchableOpacity
          style={[styles.button, styles.disconnectButton]}
          onPress={onDisconnect}>
          <Text style={styles.buttonText}>Disconnect</Text>
        </TouchableOpacity>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 12,
  },
  button: {
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 8,
    minWidth: 120,
    alignItems: 'center',
  },
  scanButton: {
    backgroundColor: '#2196F3',
  },
  disconnectButton: {
    backgroundColor: '#E53935',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
