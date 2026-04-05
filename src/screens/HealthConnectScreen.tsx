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

type DistanceRecord = {
  startTime: string;
  endTime: string;
  distance: {inMeters: number};
};

type CaloriesRecord = {
  startTime: string;
  endTime: string;
  energy: {inKilocalories: number};
};

type PowerRecord = {
  startTime: string;
  endTime: string;
  samples: {time: string; power: {inWatts: number}}[];
};

type SpeedRecord = {
  startTime: string;
  endTime: string;
  samples: {time: string; speed: {inMetersPerSecond: number}}[];
};

type CadenceRecord = {
  startTime: string;
  endTime: string;
  samples: {time: string; revolutionsPerMinute: number}[];
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
  const [distanceRecords, setDistanceRecords] = useState<DistanceRecord[]>([]);
  const [caloriesRecords, setCaloriesRecords] = useState<CaloriesRecord[]>([]);
  const [powerRecords, setPowerRecords] = useState<PowerRecord[]>([]);
  const [speedRecords, setSpeedRecords] = useState<SpeedRecord[]>([]);
  const [cadenceRecords, setCadenceRecords] = useState<CadenceRecord[]>([]);
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
        {accessType: 'read', recordType: 'Distance'},
        {accessType: 'read', recordType: 'ActiveCaloriesBurned'},
        {accessType: 'read', recordType: 'Power'},
        {accessType: 'read', recordType: 'Speed'},
        {accessType: 'read', recordType: 'CyclingPedalingCadence'},
      ]);

      const now = new Date();
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const timeRangeFilter = {
        operator: 'between' as const,
        startTime: weekAgo.toISOString(),
        endTime: now.toISOString(),
      };

      const [heartRate, steps, exercise, distance, calories, power, speed, cadence] =
        await Promise.all([
          readRecords('HeartRate', {timeRangeFilter}),
          readRecords('Steps', {timeRangeFilter}),
          readRecords('ExerciseSession', {timeRangeFilter}),
          readRecords('Distance', {timeRangeFilter}),
          readRecords('ActiveCaloriesBurned', {timeRangeFilter}),
          readRecords('Power', {timeRangeFilter}),
          readRecords('Speed', {timeRangeFilter}),
          readRecords('CyclingPedalingCadence', {timeRangeFilter}),
        ]);

      setData({
        heartRateRecords: heartRate.records as unknown as HeartRateRecord[],
        stepsRecords: steps.records as unknown as StepsRecord[],
        exerciseRecords: exercise.records as unknown as ExerciseRecord[],
      });
      setDistanceRecords(distance.records as unknown as DistanceRecord[]);
      setCaloriesRecords(calories.records as unknown as CaloriesRecord[]);
      setPowerRecords(power.records as unknown as PowerRecord[]);
      setSpeedRecords(speed.records as unknown as SpeedRecord[]);
      setCadenceRecords(cadence.records as unknown as CadenceRecord[]);
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
                <ExerciseSection
                  records={data.exerciseRecords}
                  heartRateRecords={data.heartRateRecords}
                  distanceRecords={distanceRecords}
                  caloriesRecords={caloriesRecords}
                  powerRecords={powerRecords}
                  speedRecords={speedRecords}
                  cadenceRecords={cadenceRecords}
                />
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

/** Find records that overlap with a given time range. */
function findOverlapping<T extends {startTime: string; endTime: string}>(
  records: T[],
  start: string,
  end: string,
): T[] {
  const s = new Date(start).getTime();
  const e = new Date(end).getTime();
  return records.filter(r => {
    const rs = new Date(r.startTime).getTime();
    const re = new Date(r.endTime).getTime();
    return rs < e && re > s;
  });
}

function ExerciseSection({
  records,
  heartRateRecords,
  distanceRecords,
  caloriesRecords,
  powerRecords,
  speedRecords,
  cadenceRecords,
}: {
  records: ExerciseRecord[];
  heartRateRecords: HeartRateRecord[];
  distanceRecords: DistanceRecord[];
  caloriesRecords: CaloriesRecord[];
  powerRecords: PowerRecord[];
  speedRecords: SpeedRecord[];
  cadenceRecords: CadenceRecord[];
}) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  if (records.length === 0) {
    return <Text style={styles.emptyText}>No exercise data</Text>;
  }

  const sorted = records.slice().reverse();

  return (
    <View>
      <Text style={styles.recordCount}>{records.length} sessions</Text>
      {sorted.map((record, i) => {
        const duration = Math.round(
          (new Date(record.endTime).getTime() -
            new Date(record.startTime).getTime()) /
            60000,
        );
        const typeName =
          record.title ||
          EXERCISE_TYPE_NAMES[record.exerciseType] ||
          `Type ${record.exerciseType}`;
        const isExpanded = expandedIndex === i;

        return (
          <Pressable
            key={i}
            style={styles.recordItem}
            onPress={() => setExpandedIndex(isExpanded ? null : i)}>
            <View style={styles.exerciseRow}>
              <View style={styles.exerciseRowLeft}>
                <Text style={styles.recordTime}>
                  {formatDateTime(record.startTime)}
                </Text>
                <Text style={styles.recordValue}>
                  {typeName} | {duration} min
                </Text>
              </View>
              <Text style={styles.chevron}>{isExpanded ? '\u25B2' : '\u25BC'}</Text>
            </View>

            {isExpanded && (
              <ExerciseDetailView
                record={record}
                heartRateRecords={heartRateRecords}
                distanceRecords={distanceRecords}
                caloriesRecords={caloriesRecords}
                powerRecords={powerRecords}
                speedRecords={speedRecords}
                cadenceRecords={cadenceRecords}
              />
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

function ExerciseDetailView({
  record,
  heartRateRecords,
  distanceRecords,
  caloriesRecords,
  powerRecords,
  speedRecords,
  cadenceRecords,
}: {
  record: ExerciseRecord;
  heartRateRecords: HeartRateRecord[];
  distanceRecords: DistanceRecord[];
  caloriesRecords: CaloriesRecord[];
  powerRecords: PowerRecord[];
  speedRecords: SpeedRecord[];
  cadenceRecords: CadenceRecord[];
}) {
  // Distance
  const overlappingDistance = findOverlapping(
    distanceRecords,
    record.startTime,
    record.endTime,
  );
  const totalDistanceM = overlappingDistance.reduce(
    (sum, r) => sum + r.distance.inMeters,
    0,
  );

  // Calories
  const overlappingCalories = findOverlapping(
    caloriesRecords,
    record.startTime,
    record.endTime,
  );
  const totalCalories = overlappingCalories.reduce(
    (sum, r) => sum + r.energy.inKilocalories,
    0,
  );

  // Heart rate during session
  const overlappingHr = findOverlapping(
    heartRateRecords,
    record.startTime,
    record.endTime,
  );
  const hrSamples = overlappingHr.flatMap(r => r.samples);
  const avgHr =
    hrSamples.length > 0
      ? Math.round(
          hrSamples.reduce((s, v) => s + v.beatsPerMinute, 0) /
            hrSamples.length,
        )
      : null;
  const maxHr =
    hrSamples.length > 0
      ? Math.max(...hrSamples.map(s => s.beatsPerMinute))
      : null;
  const minHr =
    hrSamples.length > 0
      ? Math.min(...hrSamples.map(s => s.beatsPerMinute))
      : null;

  // Power
  const overlappingPower = findOverlapping(
    powerRecords,
    record.startTime,
    record.endTime,
  );
  const powerSamples = overlappingPower.flatMap(r => r.samples);
  const avgPower =
    powerSamples.length > 0
      ? Math.round(
          powerSamples.reduce((s, v) => s + v.power.inWatts, 0) /
            powerSamples.length,
        )
      : null;
  const maxPower =
    powerSamples.length > 0
      ? Math.round(Math.max(...powerSamples.map(s => s.power.inWatts)))
      : null;

  // Speed
  const overlappingSpeed = findOverlapping(
    speedRecords,
    record.startTime,
    record.endTime,
  );
  const speedSamples = overlappingSpeed.flatMap(r => r.samples);
  const avgSpeedMs =
    speedSamples.length > 0
      ? speedSamples.reduce((s, v) => s + v.speed.inMetersPerSecond, 0) /
        speedSamples.length
      : null;
  const maxSpeedMs =
    speedSamples.length > 0
      ? Math.max(...speedSamples.map(s => s.speed.inMetersPerSecond))
      : null;

  // Cadence
  const overlappingCadence = findOverlapping(
    cadenceRecords,
    record.startTime,
    record.endTime,
  );
  const cadenceSamples = overlappingCadence.flatMap(r => r.samples);
  const avgCadence =
    cadenceSamples.length > 0
      ? Math.round(
          cadenceSamples.reduce((s, v) => s + v.revolutionsPerMinute, 0) /
            cadenceSamples.length,
        )
      : null;
  const maxCadence =
    cadenceSamples.length > 0
      ? Math.round(
          Math.max(...cadenceSamples.map(s => s.revolutionsPerMinute)),
        )
      : null;

  const hasAnyData =
    totalDistanceM > 0 ||
    totalCalories > 0 ||
    hrSamples.length > 0 ||
    powerSamples.length > 0 ||
    speedSamples.length > 0 ||
    cadenceSamples.length > 0;

  if (!hasAnyData) {
    return (
      <View style={styles.detailContainer}>
        <Text style={styles.detailEmpty}>No additional data for this session</Text>
      </View>
    );
  }

  // Convert m/s to km/h for display
  const formatSpeed = (ms: number) => (ms * 3.6).toFixed(1);

  return (
    <View style={styles.detailContainer}>
      {totalDistanceM > 0 && (
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Distance</Text>
          <Text style={styles.detailValue}>
            {totalDistanceM >= 1000
              ? `${(totalDistanceM / 1000).toFixed(2)} km`
              : `${Math.round(totalDistanceM)} m`}
          </Text>
        </View>
      )}
      {totalCalories > 0 && (
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Calories</Text>
          <Text style={styles.detailValue}>
            {Math.round(totalCalories)} kcal
          </Text>
        </View>
      )}
      {avgHr !== null && (
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Heart Rate</Text>
          <Text style={styles.detailValue}>
            Avg {avgHr} | Min {minHr} | Max {maxHr} bpm
          </Text>
        </View>
      )}
      {avgPower !== null && (
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Power</Text>
          <Text style={styles.detailValue}>
            Avg {avgPower} | Max {maxPower} W
          </Text>
        </View>
      )}
      {avgSpeedMs !== null && (
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Speed</Text>
          <Text style={styles.detailValue}>
            Avg {formatSpeed(avgSpeedMs)} | Max {formatSpeed(maxSpeedMs!)} km/h
          </Text>
        </View>
      )}
      {avgCadence !== null && (
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Cadence</Text>
          <Text style={styles.detailValue}>
            Avg {avgCadence} | Max {maxCadence} rpm
          </Text>
        </View>
      )}
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
  exerciseRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  exerciseRowLeft: {
    flex: 1,
  },
  chevron: {
    fontSize: 12,
    color: '#999',
    marginLeft: 8,
  },
  detailContainer: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#ddd',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  detailLabel: {
    fontSize: 13,
    color: '#666',
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
  },
  detailEmpty: {
    fontSize: 13,
    color: '#999',
    fontStyle: 'italic',
  },
});
