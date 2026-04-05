import React, {useCallback, useEffect, useState} from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {
  getSdkStatus,
  initialize,
  readRecords,
  requestPermission,
  SdkAvailabilityStatus,
} from 'react-native-health-connect';

type HealthData = {
  heartRateRecords: HeartRateRecord[];
  stepsRecords: StepsRecord[];
  exerciseRecords: ExerciseRecord[];
};

type HeartRateRecord = {
  startTime: string;
  endTime: string;
  samples: {time: string; beatsPerMinute: number}[];
};

type StepsRecord = {
  startTime: string;
  endTime: string;
  count: number;
};

type ExerciseRecord = {
  startTime: string;
  endTime: string;
  exerciseType: number;
  title?: string;
};

const EXERCISE_TYPE_NAMES: Record<number, string> = {
  0: 'Other',
  2: 'Badminton',
  4: 'Baseball',
  5: 'Basketball',
  8: 'Biking',
  9: 'Biking (Stationary)',
  10: 'Boot Camp',
  11: 'Boxing',
  14: 'Cricket',
  16: 'Dancing',
  25: 'Football (American)',
  26: 'Football (Australian)',
  27: 'Frisbee',
  28: 'Golf',
  35: 'Hiking',
  36: 'Ice Hockey',
  37: 'Ice Skating',
  44: 'Martial Arts',
  46: 'Paddling',
  48: 'Pilates',
  50: 'Racquetball',
  51: 'Rock Climbing',
  52: 'Roller Hockey',
  53: 'Rowing',
  54: 'Rowing (Machine)',
  56: 'Running',
  57: 'Running (Treadmill)',
  58: 'Sailing',
  61: 'Skating',
  62: 'Skiing',
  63: 'Snowboarding',
  64: 'Snowshoeing',
  65: 'Soccer',
  66: 'Softball',
  67: 'Squash',
  69: 'Stair Climbing',
  70: 'Stair Climbing (Machine)',
  71: 'Strength Training',
  73: 'Surfing',
  74: 'Swimming (Open Water)',
  75: 'Swimming (Pool)',
  76: 'Table Tennis',
  78: 'Tennis',
  80: 'Volleyball',
  82: 'Walking',
  83: 'Water Polo',
  84: 'Weightlifting',
  87: 'Yoga',
};

type Status = 'loading' | 'unavailable' | 'ready' | 'error';

export function HealthConnectScreen() {
  const [status, setStatus] = useState<Status>('loading');
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    checkAvailability();
  }, []);

  async function checkAvailability() {
    try {
      const sdkStatus = await getSdkStatus();
      if (sdkStatus === SdkAvailabilityStatus.SDK_AVAILABLE) {
        const initialized = await initialize();
        if (initialized) {
          setStatus('ready');
        } else {
          setStatus('error');
          setError('Failed to initialize Health Connect');
        }
      } else if (
        sdkStatus ===
        SdkAvailabilityStatus.SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED
      ) {
        setStatus('unavailable');
        setError('Health Connect needs to be updated');
      } else {
        setStatus('unavailable');
        setError('Health Connect is not available on this device');
      }
    } catch (e: any) {
      setStatus('error');
      setError(e.message || 'Unknown error');
    }
  }

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await requestPermission([
        {accessType: 'read', recordType: 'HeartRate'},
        {accessType: 'read', recordType: 'Steps'},
        {accessType: 'read', recordType: 'ExerciseSession'},
      ]);

      const now = new Date();
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const timeRangeFilter = {
        operator: 'between' as const,
        startTime: weekAgo.toISOString(),
        endTime: now.toISOString(),
      };

      const [heartRate, steps, exercise] = await Promise.all([
        readRecords('HeartRate', {timeRangeFilter}),
        readRecords('Steps', {timeRangeFilter}),
        readRecords('ExerciseSession', {timeRangeFilter}),
      ]);

      setData({
        heartRateRecords: heartRate.records as unknown as HeartRateRecord[],
        stepsRecords: steps.records as unknown as StepsRecord[],
        exerciseRecords: exercise.records as unknown as ExerciseRecord[],
      });
    } catch (e: any) {
      setError(e.message || 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  }, []);

  if (status === 'loading') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#4A90D9" />
          <Text style={styles.statusText}>Checking Health Connect...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (status === 'unavailable') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <Text style={styles.errorText}>{error}</Text>
          <Text style={styles.hintText}>
            Please install Health Connect from Google Play
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Health Connect</Text>
      </View>

      {error && <Text style={styles.errorBanner}>{error}</Text>}

      <Pressable
        style={[styles.fetchButton, loading && styles.fetchButtonDisabled]}
        onPress={fetchData}
        disabled={loading}>
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.fetchButtonText}>
            {data ? 'Refresh Data' : 'Fetch Last 7 Days'}
          </Text>
        )}
      </Pressable>

      {data && (
        <FlatList
          data={[
            {key: 'heartRate', title: 'Heart Rate'},
            {key: 'steps', title: 'Steps'},
            {key: 'exercise', title: 'Exercise Sessions'},
          ]}
          keyExtractor={item => item.key}
          renderItem={({item}) => (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{item.title}</Text>
              {item.key === 'heartRate' && (
                <HeartRateSection records={data.heartRateRecords} />
              )}
              {item.key === 'steps' && (
                <StepsSection records={data.stepsRecords} />
              )}
              {item.key === 'exercise' && (
                <ExerciseSection records={data.exerciseRecords} />
              )}
            </View>
          )}
          contentContainerStyle={styles.listContent}
        />
      )}
    </SafeAreaView>
  );
}

function HeartRateSection({records}: {records: HeartRateRecord[]}) {
  if (records.length === 0) {
    return <Text style={styles.emptyText}>No heart rate data</Text>;
  }

  // Show latest samples from recent records
  const recentRecords = records.slice(-10);
  return (
    <View>
      <Text style={styles.recordCount}>{records.length} records total</Text>
      {recentRecords.map((record, i) => {
        const avgBpm =
          record.samples.length > 0
            ? Math.round(
                record.samples.reduce((s, v) => s + v.beatsPerMinute, 0) /
                  record.samples.length,
              )
            : 0;
        const minBpm =
          record.samples.length > 0
            ? Math.min(...record.samples.map(s => s.beatsPerMinute))
            : 0;
        const maxBpm =
          record.samples.length > 0
            ? Math.max(...record.samples.map(s => s.beatsPerMinute))
            : 0;
        return (
          <View key={i} style={styles.recordItem}>
            <Text style={styles.recordTime}>
              {formatDateTime(record.startTime)}
            </Text>
            <Text style={styles.recordValue}>
              Avg: {avgBpm} bpm (min: {minBpm}, max: {maxBpm}) | {record.samples.length} samples
            </Text>
          </View>
        );
      })}
    </View>
  );
}

function StepsSection({records}: {records: StepsRecord[]}) {
  if (records.length === 0) {
    return <Text style={styles.emptyText}>No steps data</Text>;
  }

  const totalSteps = records.reduce((sum, r) => sum + r.count, 0);

  // Group by date
  const byDate = new Map<string, number>();
  records.forEach(r => {
    const date = r.startTime.split('T')[0];
    byDate.set(date, (byDate.get(date) || 0) + r.count);
  });

  return (
    <View>
      <Text style={styles.recordCount}>
        Total: {totalSteps.toLocaleString()} steps
      </Text>
      {Array.from(byDate.entries())
        .sort((a, b) => b[0].localeCompare(a[0]))
        .map(([date, count]) => (
          <View key={date} style={styles.recordItem}>
            <Text style={styles.recordTime}>{date}</Text>
            <Text style={styles.recordValue}>
              {count.toLocaleString()} steps
            </Text>
          </View>
        ))}
    </View>
  );
}

function ExerciseSection({records}: {records: ExerciseRecord[]}) {
  if (records.length === 0) {
    return <Text style={styles.emptyText}>No exercise data</Text>;
  }

  return (
    <View>
      <Text style={styles.recordCount}>{records.length} sessions</Text>
      {records
        .slice()
        .reverse()
        .map((record, i) => {
          const duration = Math.round(
            (new Date(record.endTime).getTime() -
              new Date(record.startTime).getTime()) /
              60000,
          );
          const typeName =
            record.title ||
            EXERCISE_TYPE_NAMES[record.exerciseType] ||
            `Type ${record.exerciseType}`;
          return (
            <View key={i} style={styles.recordItem}>
              <Text style={styles.recordTime}>
                {formatDateTime(record.startTime)}
              </Text>
              <Text style={styles.recordValue}>
                {typeName} | {duration} min
              </Text>
            </View>
          );
        })}
    </View>
  );
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  header: {
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
  statusText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  errorText: {
    fontSize: 16,
    color: '#D32F2F',
    textAlign: 'center',
  },
  hintText: {
    marginTop: 8,
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  errorBanner: {
    backgroundColor: '#FFEBEE',
    padding: 12,
    margin: 16,
    borderRadius: 8,
    color: '#D32F2F',
    fontSize: 14,
  },
  fetchButton: {
    backgroundColor: '#4A90D9',
    margin: 16,
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  fetchButtonDisabled: {
    opacity: 0.6,
  },
  fetchButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  section: {
    marginBottom: 20,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 12,
  },
  recordCount: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
  },
  recordItem: {
    paddingVertical: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#eee',
  },
  recordTime: {
    fontSize: 13,
    color: '#888',
  },
  recordValue: {
    fontSize: 15,
    fontWeight: '500',
    color: '#333',
    marginTop: 2,
  },
});
