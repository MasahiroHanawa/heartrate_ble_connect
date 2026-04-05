# BLE Heart Rate Monitor

A React Native prototype that demonstrates real-time heart rate data collection from BLE (Bluetooth Low Energy) sensors, with Android Health Connect integration for accessing synchronized health data.

Built as a feasibility study for mobile health data collection — the kind of sensor-to-app pipeline used in digital health research platforms.

## Features

### BLE Heart Rate Streaming
- Scans for nearby Bluetooth heart rate sensors (standard Heart Rate Service 0x180D)
- Connects and streams real-time BPM data
- Displays current heart rate with rolling history (last 20 readings)
- Supports both 8-bit and 16-bit BPM formats per Bluetooth SIG specification
- Mock mode for development/testing without physical hardware

### Health Connect (Android)
- Reads historical health data from Android's Health Connect API
- Heart rate records with avg/min/max BPM statistics
- Daily step counts
- Exercise session history with duration and type
- Fetches the last 7 days of data

## Architecture

```
src/
├── types/
│   └── HeartRateSource.ts      # Interface for swappable data sources
├── services/
│   ├── BleHeartRateSource.ts    # Real BLE implementation
│   ├── MockHeartRateSource.ts   # Mock for development/testing
│   └── heartRateParser.ts       # BLE characteristic value parser
├── hooks/
│   └── useHeartRateStream.ts    # React hook managing state & subscriptions
├── screens/
│   ├── HeartRateScreen.tsx      # BLE monitor screen
│   └── HealthConnectScreen.tsx  # Health Connect data viewer
└── components/
    ├── HeartRateDisplay.tsx      # BPM display + history
    ├── DeviceList.tsx            # Discovered device list
    └── ControlPanel.tsx          # Scan/disconnect controls
```

**Key design decisions:**
- `HeartRateSource` interface allows swapping between BLE, mock, and future data sources without changing UI code
- Heart rate parsing is isolated in its own module for testability
- Callback-based subscriptions with cleanup functions to prevent memory leaks

## Requirements

- Node.js >= 22.11.0
- React Native 0.84 development environment ([setup guide](https://reactnative.dev/docs/set-up-your-environment))
- For BLE features: a physical device with Bluetooth (BLE does not work in emulators)
- For Health Connect: Android device with Health Connect installed

## Getting Started

```sh
# Install dependencies
npm install

# Start Metro bundler
npm start

# Run on Android
npm run android

# Run on iOS (install CocoaPods first)
bundle install
bundle exec pod install
npm run ios
```

## Testing

```sh
npm test
```

Tests cover:
- **Heart rate parsing** — BLE characteristic value decoding (8-bit/16-bit BPM, base64 decode)
- **MockHeartRateSource** — State transitions, device discovery, heart rate emission, cleanup
- **useHeartRateStream hook** — State management, history capping, subscription lifecycle, unmount cleanup

## Permissions

### Android
- `BLUETOOTH_SCAN`, `BLUETOOTH_CONNECT` (API 31+)
- `ACCESS_FINE_LOCATION` (required for BLE scanning)
- Health Connect read permissions for HeartRate, Steps, ExerciseSession

### iOS
- Bluetooth usage (configured via Info.plist)

## Tech Stack

- React Native 0.84 / React 19
- TypeScript 5.8
- `react-native-ble-plx` — BLE communication
- `react-native-health-connect` — Android Health Connect API
- Jest — Testing

## Known Limitations

- No background scanning or automatic reconnection
- No persistent local data storage (data is in-memory only)
- Health Connect is Android-only (no Apple HealthKit integration yet)
- No data export or sync to remote server
- Minimal error recovery on connection failures

## Next Steps

- Connection state management with automatic reconnection
- Local data persistence for offline-first operation
- Apple HealthKit integration for iOS parity
- Data quality validation and anomaly detection
- Structured data export (FHIR-compatible)
