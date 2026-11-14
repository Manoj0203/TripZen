import polyfillInteractionManager from '../src/utils/interactionManagerPolyfill';
const ReactNative = require('react-native');

describe('InteractionManager Polyfill for React Native 0.88+', () => {
  test('InteractionManager exists and does not throw on method calls', () => {
    expect(ReactNative.InteractionManager).toBeDefined();
    expect(typeof ReactNative.InteractionManager.createInteractionHandle).toBe('function');
    expect(typeof ReactNative.InteractionManager.clearInteractionHandle).toBe('function');
    expect(typeof ReactNative.InteractionManager.runAfterInteractions).toBe('function');

    expect(() => {
      const handle = ReactNative.InteractionManager.createInteractionHandle();
      ReactNative.InteractionManager.clearInteractionHandle(handle);
    }).not.toThrow();
  });

  test('runAfterInteractions executes callback safely', async () => {
    let executed = false;
    await new Promise(resolve => {
      ReactNative.InteractionManager.runAfterInteractions(() => {
        executed = true;
        resolve();
      });
    });
    expect(executed).toBe(true);
  });
});
