import React from 'react';
import {FlatList, StyleSheet, Text, View} from 'react-native';
import type {ConnectionState} from '../types/HeartRateSource';

interface Props {
  bpm: number | null;
  connectionState: ConnectionState;
  connectedDeviceName: string | null;
  history: number[];
}

function HistoryItem({value, index}: {value: number; index: number}) {
  return (
    <Text style={styles.historyItem}>
      {index + 1}. {value} bpm
    </Text>
  );
}

const MemoizedHistoryItem = React.memo(HistoryItem);

export const HeartRateDisplay = React.memo(function HeartRateDisplay({
  bpm,
  connectionState,
  connectedDeviceName,
  history,
}: Props) {
  return (
    <View style={styles.container}>
      {/* Connection info */}
      <View style={styles.statusRow}>
        <View
          style={[
            styles.statusDot,
            connectionState === 'connected'
              ? styles.dotConnected
              : connectionState === 'reconnecting'
                ? styles.dotReconnecting
                : styles.dotDisconnected,
          ]}
        />
        <Text style={styles.statusText}>{connectionState}</Text>
      </View>

      {connectedDeviceName && (
        <Text style={styles.deviceName}>{connectedDeviceName}</Text>
      )}

      {/* Heart rate */}
      <View style={styles.bpmContainer}>
        <Text style={styles.bpmValue}>{bpm ?? '--'}</Text>
        <Text style={styles.bpmUnit}>bpm</Text>
      </View>

      {/* History */}
      {history.length > 0 && (
        <View style={styles.historyContainer}>
          <Text style={styles.historyTitle}>Recent</Text>
          <FlatList
            data={history}
            keyExtractor={(_item, index) => String(index)}
            renderItem={({item, index}) => (
              <MemoizedHistoryItem value={item} index={index} />
            )}
            style={styles.historyList}
          />
        </View>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  dotConnected: {
    backgroundColor: '#4CAF50',
  },
  dotReconnecting: {
    backgroundColor: '#FF9800',
  },
  dotDisconnected: {
    backgroundColor: '#999',
  },
  statusText: {
    fontSize: 14,
    color: '#666',
    textTransform: 'capitalize',
  },
  deviceName: {
    fontSize: 13,
    color: '#888',
    marginBottom: 12,
  },
  bpmContainer: {
    alignItems: 'center',
    marginVertical: 24,
  },
  bpmValue: {
    fontSize: 72,
    fontWeight: '700',
    color: '#E53935',
  },
  bpmUnit: {
    fontSize: 18,
    color: '#888',
    marginTop: -4,
  },
  historyContainer: {
    width: '100%',
    paddingHorizontal: 24,
    maxHeight: 200,
  },
  historyTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  historyList: {
    maxHeight: 180,
  },
  historyItem: {
    fontSize: 13,
    color: '#555',
    paddingVertical: 2,
  },
});
