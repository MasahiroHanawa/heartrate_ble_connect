import React, {useState} from 'react';
import {Platform, Pressable, StatusBar, StyleSheet, Text, View, useColorScheme} from 'react-native';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {HeartRateScreen} from './src/screens/HeartRateScreen';
import {HealthConnectScreen} from './src/screens/HealthConnectScreen';

type Tab = 'ble' | 'healthconnect';

function App() {
  const isDarkMode = useColorScheme() === 'dark';
  const [activeTab, setActiveTab] = useState<Tab>('ble');
  const isAndroid = Platform.OS === 'android';

  return (
    <SafeAreaProvider>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      {activeTab === 'ble' ? <HeartRateScreen /> : <HealthConnectScreen />}

      {isAndroid && (
        <View style={styles.tabBar}>
          <Pressable
            style={[styles.tab, activeTab === 'ble' && styles.tabActive]}
            onPress={() => setActiveTab('ble')}>
            <Text
              style={[
                styles.tabText,
                activeTab === 'ble' && styles.tabTextActive,
              ]}>
              BLE Sensor
            </Text>
          </Pressable>
          <Pressable
            style={[
              styles.tab,
              activeTab === 'healthconnect' && styles.tabActive,
            ]}
            onPress={() => setActiveTab('healthconnect')}>
            <Text
              style={[
                styles.tabText,
                activeTab === 'healthconnect' && styles.tabTextActive,
              ]}>
              Health Connect
            </Text>
          </Pressable>
        </View>
      )}
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#ddd',
    backgroundColor: '#fff',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  tabActive: {
    borderTopWidth: 2,
    borderTopColor: '#4A90D9',
  },
  tabText: {
    fontSize: 14,
    color: '#999',
    fontWeight: '500',
  },
  tabTextActive: {
    color: '#4A90D9',
    fontWeight: '700',
  },
});

export default App;
