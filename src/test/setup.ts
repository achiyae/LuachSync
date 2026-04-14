import '@testing-library/jest-dom';

// Node.js 22+ exposes a built-in `localStorage` global (backed by
// `--localstorage-file`) that leaks into vitest's jsdom window and lacks
// the `clear` method when no file path is configured. Override it with a
// fully-compliant in-memory Storage implementation so tests can freely call
// localStorage.clear(), .setItem(), .getItem(), etc.
const makeStorageMock = () => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null,
    setItem: (key: string, value: string) => { store[key] = String(value); },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
    get length() { return Object.keys(store).length; },
    key: (index: number) => Object.keys(store)[index] ?? null,
  };
};

if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'localStorage', { value: makeStorageMock(), writable: true });
  Object.defineProperty(window, 'sessionStorage', { value: makeStorageMock(), writable: true });
}
