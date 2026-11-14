/**
 * Polyfill for InteractionManager which was removed in React Native 0.88+.
 * Legacy libraries like react-native-modal access InteractionManager.createInteractionHandle()
 * and InteractionManager.clearInteractionHandle().
 * This polyfill redefines InteractionManager on react-native to safely prevent Invariant Violations.
 */

const polyfillInteractionManager = {
  runAfterInteractions(task) {
    let handle;
    const promise = new Promise(resolve => {
      handle =
        typeof requestIdleCallback === 'function'
          ? requestIdleCallback(() => resolve(task ? task() : undefined))
          : setTimeout(() => resolve(task ? task() : undefined), 0);
    });
    return {
      then: (...args) => promise.then(...args),
      done: (...args) => (promise.done ? promise.done(...args) : promise.then(...args)),
      cancel: () => {
        if (typeof cancelIdleCallback === 'function') {
          cancelIdleCallback(handle);
        } else {
          clearTimeout(handle);
        }
      },
    };
  },
  createInteractionHandle() {
    return 1;
  },
  clearInteractionHandle(_handle) {},
  setDeadline(_deadline) {},
};

// Polyfill directly on ReactNative CommonJS module export
try {
  const ReactNative = require('react-native');
  if (ReactNative) {
    Object.defineProperty(ReactNative, 'InteractionManager', {
      configurable: true,
      enumerable: true,
      writable: true,
      value: polyfillInteractionManager,
    });
  }
} catch (_e) {
  // Ignore
}

if (typeof globalThis !== 'undefined') {
  globalThis.InteractionManager = polyfillInteractionManager;
}

export default polyfillInteractionManager;
