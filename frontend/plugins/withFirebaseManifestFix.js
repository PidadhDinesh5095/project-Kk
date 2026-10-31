const { withAndroidManifest } = require('expo/config-plugins');

// Both expo-notifications and @react-native-firebase/messaging declare these
// two defaults. Telling the manifest merger to prefer the app's values
// resolves the "also present at [:react-native-firebase_messaging]" error.
const REPLACE = {
  'com.google.firebase.messaging.default_notification_channel_id': 'android:value',
  'com.google.firebase.messaging.default_notification_color': 'android:resource',
};

module.exports = function withFirebaseManifestFix(config) {
  return withAndroidManifest(config, (cfg) => {
    const manifest = cfg.modResults.manifest;
    manifest.$['xmlns:tools'] = 'http://schemas.android.com/tools';

    const metaData = manifest.application?.[0]?.['meta-data'] ?? [];
    for (const item of metaData) {
      const attr = REPLACE[item.$['android:name']];
      if (attr) item.$['tools:replace'] = attr;
    }
    return cfg;
  });
};