const fs = require('fs');
const path = require('path');

const modalFilePath = path.join(
  __dirname,
  '..',
  'node_modules',
  'react-native-modal',
  'dist',
  'modal.js'
);

if (fs.existsSync(modalFilePath)) {
  let content = fs.readFileSync(modalFilePath, 'utf8');
  if (content.includes('InteractionManager, KeyboardAvoidingView')) {
    content = content.replace(
      "import { Animated, DeviceEventEmitter, Dimensions, InteractionManager, KeyboardAvoidingView, Modal, PanResponder, Platform, TouchableWithoutFeedback, View, } from 'react-native';",
      `import { Animated, DeviceEventEmitter, Dimensions, KeyboardAvoidingView, Modal, PanResponder, Platform, TouchableWithoutFeedback, View, } from 'react-native';\nconst InteractionManager = {\n    createInteractionHandle: () => 1,\n    clearInteractionHandle: () => {},\n    runAfterInteractions: (fn) => (fn ? fn() : undefined),\n};`
    );
    fs.writeFileSync(modalFilePath, content, 'utf8');
    console.log('[TripZen] Patched react-native-modal for React Native 0.88+');
  }
}
