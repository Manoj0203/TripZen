module.exports = {
  preset: '@react-native/jest-preset',
  setupFiles: ['./jest.setup.js'],
  transformIgnorePatterns: [
    'node_modules/(?!(@react-native|react-native|@react-navigation|react-native-qrcode-svg|uuid|@op-engineering|react-native-modal|react-native-animatable)/)',
  ],
};
