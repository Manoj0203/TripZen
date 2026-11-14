// Global Jest setup for React Native environment
jest.mock('@op-engineering/op-sqlite', () => ({
  open: jest.fn(() => ({
    executeSync: jest.fn(() => ({ rows: [] })),
    execute: jest.fn(() => Promise.resolve({ rows: [] })),
    executeRaw: jest.fn(() => Promise.resolve({ rawRows: [], columnNames: [] })),
    executeRawAsync: jest.fn(() => Promise.resolve({ rawRows: [], columnNames: [] })),
    executeAsync: jest.fn(() => Promise.resolve({ rows: [] })),
  })),
}));
