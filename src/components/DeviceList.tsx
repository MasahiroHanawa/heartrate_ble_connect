import React from 'react';
import {
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import type {DiscoveredDevice} from '../types/HeartRateSource';

interface Props {
  devices: DiscoveredDevice[];
  onSelect: (device: DiscoveredDevice) => void;
}

function DeviceItem({
  device,
  onSelect,
}: {
  device: DiscoveredDevice;
  onSelect: (device: DiscoveredDevice) => void;
}) {
  return (
    <TouchableOpacity style={styles.item} onPress={() => onSelect(device)}>
      <Text style={styles.name}>{device.name ?? 'Unknown'}</Text>
      <Text style={styles.id}>{device.id}</Text>
    </TouchableOpacity>
  );
}

const MemoizedDeviceItem = React.memo(DeviceItem);

export function DeviceList({devices, onSelect}: Props) {
  if (devices.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>Scanning for devices...</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={devices}
      keyExtractor={item => item.id}
      renderItem={({item}) => (
        <MemoizedDeviceItem device={item} onSelect={onSelect} />
      )}
      style={styles.list}
    />
  );
}

const styles = StyleSheet.create({
  list: {
    maxHeight: 200,
  },
  item: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#ccc',
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  id: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  empty: {
    padding: 24,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#888',
  },
});
